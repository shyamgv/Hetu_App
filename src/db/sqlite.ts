import * as SQLite from 'expo-sqlite';
import type { UserOut, ProfileOut, ConversationOut, MessageOut } from '../types/api.types';

// Synchronous database initialization with WAL mode
let db: SQLite.SQLiteDatabase | null = null;

function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('hetu.db');
    initTables(db);
  }
  return db;
}

function initTables(database: SQLite.SQLiteDatabase) {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS local_user (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_user_profile (
      user_id TEXT PRIMARY KEY NOT NULL,
      age INTEGER,
      gender TEXT,
      location TEXT,
      race TEXT,
      occupation TEXT,
      education TEXT,
      hobbies TEXT,
      bio TEXT,
      resume_text TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_conversations (
      id TEXT PRIMARY KEY NOT NULL,
      topic TEXT,
      sentiment TEXT,
      urgency TEXT,
      intention TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      meta TEXT,
      created_at TEXT,
      FOREIGN KEY (conversation_id) REFERENCES local_conversations (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_deletions (
      conversation_id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT
    );
  `);
}



export const SQLiteService = {
  /**
   * User Cache Methods
   */
  saveUser(user: UserOut): void {
    try {
      const database = getDB();
      database.runSync(
        `INSERT OR REPLACE INTO local_user (id, email, full_name, onboarding_complete, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          user.full_name || null,
          user.onboarding_complete ? 1 : 0,
          user.created_at || '',
        ]
      );
    } catch (e) {
      console.warn('[SQLite] Error saving user:', e);
    }
  },

  getUser(): UserOut | null {
    try {
      const database = getDB();
      const row = database.getFirstSync<any>(`SELECT * FROM local_user LIMIT 1`);
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        onboarding_complete: Boolean(row.onboarding_complete),
        created_at: row.created_at,
      };
    } catch (e) {
      console.warn('[SQLite] Error getting user:', e);
      return null;
    }
  },

  clearUser(): void {
    try {
      const database = getDB();
      database.runSync(`DELETE FROM local_user`);
      database.runSync(`DELETE FROM local_user_profile`);
    } catch (e) {
      console.warn('[SQLite] Error clearing user:', e);
    }
  },

  /**
   * User Profile Cache Methods
   */
  saveProfile(profile: ProfileOut): void {
    try {
      const database = getDB();
      database.runSync(
        `INSERT OR REPLACE INTO local_user_profile (user_id, age, gender, location, race, occupation, education, hobbies, bio, resume_text, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.user_id,
          profile.age ?? null,
          profile.gender ?? null,
          profile.location ?? null,
          profile.race ?? null,
          profile.occupation ?? null,
          profile.education ?? null,
          profile.hobbies ? JSON.stringify(profile.hobbies) : null,
          profile.bio ?? null,
          profile.resume_text ?? null,
          profile.updated_at || '',
        ]
      );
    } catch (e) {
      console.warn('[SQLite] Error saving profile:', e);
    }
  },

  getProfile(): ProfileOut | null {
    try {
      const database = getDB();
      const row = database.getFirstSync<any>(`SELECT * FROM local_user_profile LIMIT 1`);
      if (!row) return null;
      return {
        user_id: row.user_id,
        age: row.age,
        gender: row.gender,
        location: row.location,
        race: row.race,
        occupation: row.occupation,
        education: row.education,
        hobbies: row.hobbies ? JSON.parse(row.hobbies) : null,
        bio: row.bio,
        resume_text: row.resume_text,
        updated_at: row.updated_at,
      };
    } catch (e) {
      console.warn('[SQLite] Error getting profile:', e);
      return null;
    }
  },


  /**
   * Conversations & Messages Cache Methods
   */
  saveConversations(conversations: ConversationOut[]): void {
    try {
      const database = getDB();
      database.withTransactionSync(() => {
        for (const c of conversations) {
          database.runSync(
            `INSERT OR REPLACE INTO local_conversations (id, topic, sentiment, urgency, intention, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              c.topic || null,
              c.sentiment || null,
              c.urgency || null,
              c.intention || null,
              c.created_at || '',
            ]
          );
          if (c.messages && Array.isArray(c.messages)) {
            for (const m of c.messages) {
              database.runSync(
                `INSERT OR REPLACE INTO local_messages (id, conversation_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  m.id,
                  c.id,
                  m.role,
                  m.content,
                  m.meta ? JSON.stringify(m.meta) : null,
                  m.created_at || '',
                ]
              );
            }
          }
        }
      });
    } catch (e) {
      console.warn('[SQLite] Error saving conversations:', e);
    }
  },

  getConversations(): ConversationOut[] {
    try {
      const database = getDB();
      const rows = database.getAllSync<any>(
        `SELECT * FROM local_conversations WHERE id NOT IN (SELECT conversation_id FROM pending_deletions) ORDER BY created_at DESC`
      );
      return rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        sentiment: row.sentiment,
        urgency: row.urgency,
        intention: row.intention,
        created_at: row.created_at,
        messages: [],
      }));
    } catch (e) {
      console.warn('[SQLite] Error getting conversations:', e);
      return [];
    }
  },


  saveConversationDetails(conversation: ConversationOut): void {
    try {
      const database = getDB();
      database.withTransactionSync(() => {
        database.runSync(
          `INSERT OR REPLACE INTO local_conversations (id, topic, sentiment, urgency, intention, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            conversation.id,
            conversation.topic || null,
            conversation.sentiment || null,
            conversation.urgency || null,
            conversation.intention || null,
            conversation.created_at || '',
          ]
        );
        if (conversation.messages && Array.isArray(conversation.messages)) {
          for (const m of conversation.messages) {
            database.runSync(
              `INSERT OR REPLACE INTO local_messages (id, conversation_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                m.id,
                conversation.id,
                m.role,
                m.content,
                m.meta ? JSON.stringify(m.meta) : null,
                m.created_at || '',
              ]
            );
          }
        }
      });
    } catch (e) {
      console.warn('[SQLite] Error saving conversation details:', e);
    }
  },

  getConversation(id: string): ConversationOut | null {
    try {
      const database = getDB();
      const convRow = database.getFirstSync<any>(
        `SELECT * FROM local_conversations WHERE id = ?`,
        [id]
      );
      if (!convRow) return null;

      const msgRows = database.getAllSync<any>(
        `SELECT * FROM local_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [id]
      );

      const messages: MessageOut[] = msgRows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        meta: m.meta ? JSON.parse(m.meta) : null,
        created_at: m.created_at,
      }));

      return {
        id: convRow.id,
        topic: convRow.topic,
        sentiment: convRow.sentiment,
        urgency: convRow.urgency,
        intention: convRow.intention,
        created_at: convRow.created_at,
        messages,
      };
    } catch (e) {
      console.warn('[SQLite] Error getting conversation:', e);
      return null;
    }
  },

  saveMessage(conversationId: string, message: MessageOut): void {
    try {
      const database = getDB();
      database.runSync(
        `INSERT OR REPLACE INTO local_messages (id, conversation_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          conversationId,
          message.role,
          message.content,
          message.meta ? JSON.stringify(message.meta) : null,
          message.created_at || '',
        ]
      );
    } catch (e) {
      console.warn('[SQLite] Error saving message:', e);
    }
  },

  deleteConversation(id: string): void {
    try {
      const database = getDB();
      database.withTransactionSync(() => {
        database.runSync(`DELETE FROM local_messages WHERE conversation_id = ?`, [id]);
        database.runSync(`DELETE FROM local_conversations WHERE id = ?`, [id]);
      });
    } catch (e) {
      console.warn('[SQLite] Error deleting conversation:', e);
    }
  },

  clearAllData(): void {
    try {
      const database = getDB();
      database.execSync(`
        DELETE FROM local_user;
        DELETE FROM local_user_profile;
        DELETE FROM local_messages;
        DELETE FROM local_conversations;
        DELETE FROM pending_deletions;
      `);
    } catch (e) {
      console.warn('[SQLite] Error clearing all data:', e);
    }
  },

  /**
   * Pending Deletion Queue Methods for Offline Sync
   */
  addPendingDeletion(id: string): void {
    try {
      const database = getDB();
      database.runSync(
        `INSERT OR REPLACE INTO pending_deletions (conversation_id, created_at) VALUES (?, ?)`,
        [id, new Date().toISOString()]
      );
    } catch (e) {
      console.warn('[SQLite] Error adding pending deletion:', e);
    }
  },

  getPendingDeletions(): string[] {
    try {
      const database = getDB();
      const rows = database.getAllSync<any>(`SELECT conversation_id FROM pending_deletions`);
      return rows.map((r) => r.conversation_id);
    } catch (e) {
      console.warn('[SQLite] Error getting pending deletions:', e);
      return [];
    }
  },

  removePendingDeletion(id: string): void {
    try {
      const database = getDB();
      database.runSync(`DELETE FROM pending_deletions WHERE conversation_id = ?`, [id]);
    } catch (e) {
      console.warn('[SQLite] Error removing pending deletion:', e);
    }
  },
};

