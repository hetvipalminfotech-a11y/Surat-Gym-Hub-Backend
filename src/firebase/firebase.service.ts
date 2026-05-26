import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../database/database.service';

export interface FcmNotificationPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private isInitialized = false;

  constructor(private db: DatabaseService) {}

  onModuleInit(): void {
    try {
      // 1. Try to load from environment variables first (standard for production/Docker environments)
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isInitialized = true;
        console.log('Firebase Admin SDK initialized successfully from Environment Variables.');
        return;
      }

      // 2. Try loading from JSON string
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        const credentials = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });
        this.isInitialized = true;
        console.log('Firebase Admin SDK initialized successfully from JSON environment variable.');
        return;
      }

      // 3. Fallback to local serviceAccountKey.json file if it exists
      const serviceAccountPath = path.resolve(
        process.cwd(),
        'serviceAccountKey.json'
      );
      
      if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        this.isInitialized = true;
        console.log('Firebase Admin SDK initialized successfully from local serviceAccountKey.json.');
      } else {
        console.warn(
          'Firebase Admin SDK configuration not found. Please set FIREBASE environment variables or add serviceAccountKey.json in the project root. Push notifications will be disabled.'
        );
      }
    } catch (error) {
      const err = error as Error;
      console.warn(
        'Failed to initialize Firebase Admin SDK. Push notifications will be disabled:',
        err.message
      );
    }
  }

  /**
   * Helper to clean/remove expired, invalid, or unregistered FCM tokens.
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      const query = "UPDATE tokens SET fcm_token = NULL WHERE fcm_token = ?";
      await this.db.execute(query, [token]);
      console.log(`Successfully cleaned invalid FCM token: ${token.substring(0, 15)}...`);
    } catch (error) {
      const err = error as Error;
      console.error('Failed to clear invalid FCM token:', err.message);
    }
  }

  /**
   * Raw multicast dispatcher. Sends a payload to specific tokens and auto-cleans invalid ones.
   */
  async sendMulticastNotification(
    registrationTokens: string[],
    payload: FcmNotificationPayload
  ): Promise<void> {
    if (!this.isInitialized || registrationTokens.length === 0) {
      console.warn('Firebase Service is not initialized or tokens array is empty.');
      return;
    }

    // Filter out duplicates and nulls safely
    const uniqueTokens = Array.from(new Set(registrationTokens)).filter(Boolean);
    if (uniqueTokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens: uniqueTokens,
      notification: {
        title: payload.notification.title,
        body: payload.notification.body,
      },
      data: payload.data || {},
      android: {
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `[FCM] Sent ${response.successCount} push notifications. Failures: ${response.failureCount}`
      );
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp: admin.messaging.SendResponse, idx: number) => {
          if (!resp.success && resp.error) {
            const token = uniqueTokens[idx];
            const errorCode = resp.error.code;
            console.warn(
              `[FCM] Token at index ${idx} failed with error (${errorCode}):`,
              resp.error.message
            );
            
            // Clean invalid/expired/unregistered device tokens automatically
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              this.removeInvalidToken(token).catch(err => {
                console.error('Failed to cleanup invalid token:', err.message);
              });
            }
          }
        });
      }
    } catch (error) {
      const err = error as Error;
      console.error('[FCM] Error sending multicast notification:', err.message);
    }
  }

  /**
   * Centralized production-ready wrapper: Send a push notification to users belonging to specific Roles.
   */
  async sendToRoles(
    roles: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (roles.length === 0) return;
    try {
      const placeholders = roles.map(() => '?').join(',');
      const query = `
        SELECT DISTINCT t.fcm_token 
        FROM tokens t
        INNER JOIN users u ON t.user_id = u.id
        WHERE u.role IN (${placeholders}) 
          AND u.status = 'ACTIVE' 
          AND t.status = 'ACTIVE' 
          AND t.fcm_token IS NOT NULL
      `;
      
      const rows = await this.db.query<{ fcm_token: string }>(query, roles);
      const tokens = rows.map(r => r.fcm_token);
      
      if (tokens.length === 0) {
        console.log(`[FCM] No active device tokens found for roles: ${roles.join(', ')}`);
        return;
      }

      await this.sendMulticastNotification(tokens, {
        notification: { title, body },
        data,
      });
    } catch (error) {
      const err = error as Error;
      console.error(`[FCM] Failed to send push notifications to roles (${roles.join(', ')}):`, err.message);
    }
  }

  /**
   * Centralized production-ready wrapper: Send a push notification to a specific User by ID.
   */
  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT t.fcm_token 
        FROM tokens t
        INNER JOIN users u ON t.user_id = u.id
        WHERE u.id = ? 
          AND u.status = 'ACTIVE' 
          AND t.status = 'ACTIVE' 
          AND t.fcm_token IS NOT NULL
      `;
      
      const rows = await this.db.query<{ fcm_token: string }>(query, [userId]);
      const tokens = rows.map(r => r.fcm_token);
      
      if (tokens.length === 0) {
        console.log(`[FCM] No active device tokens found for user ID: ${userId}`);
        return;
      }

      await this.sendMulticastNotification(tokens, {
        notification: { title, body },
        data,
      });
    } catch (error) {
      const err = error as Error;
      console.error(`[FCM] Failed to send push notification to user ID (${userId}):`, err.message);
    }
  }

  /**
   * Centralized production-ready wrapper: Send a push notification to multiple specific Users by ID.
   */
  async sendToUsers(
    userIds: number[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (userIds.length === 0) return;
    try {
      const placeholders = userIds.map(() => '?').join(',');
      const query = `
        SELECT DISTINCT t.fcm_token 
        FROM tokens t
        INNER JOIN users u ON t.user_id = u.id
        WHERE u.id IN (${placeholders}) 
          AND u.status = 'ACTIVE' 
          AND t.status = 'ACTIVE' 
          AND t.fcm_token IS NOT NULL
      `;
      
      const rows = await this.db.query<{ fcm_token: string }>(query, userIds);
      const tokens = rows.map(r => r.fcm_token);
      
      if (tokens.length === 0) {
        console.log(`[FCM] No active device tokens found for user IDs: ${userIds.join(', ')}`);
        return;
      }

      await this.sendMulticastNotification(tokens, {
        notification: { title, body },
        data,
      });
    } catch (error) {
      const err = error as Error;
      console.error(`[FCM] Failed to send push notifications to user IDs (${userIds.join(', ')}):`, err.message);
    }
  }
}

