import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

export interface CreateAuditLogParams {
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  performedBy: string;
  userRole?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private mongoConnection: mongoose.Connection | null = null;
  private auditLogModel: mongoose.Model<any> | null = null;
  private readonly inMemoryLogs: Array<AuditLog & { _id: string; createdAt: Date }> = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const mongoUri = this.configService.get<string>('MONGODB_URI');
    if (mongoUri && !mongoUri.includes('localhost:27017')) {
      // Connect to remote MongoDB (e.g. MongoDB Atlas) asynchronously
      this.initMongoConnection(mongoUri);
    } else {
      this.logger.log('AuditService using in-memory audit log buffer (MongoDB Atlas not configured)');
    }
  }

  private initMongoConnection(uri: string) {
    try {
      this.mongoConnection = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 3000,
      });

      this.mongoConnection.on('connected', () => {
        this.logger.log('Successfully connected to MongoDB Audit Trail storage');
        this.auditLogModel = this.mongoConnection!.model(AuditLog.name, AuditLogSchema);
      });

      this.mongoConnection.on('error', (err) => {
        this.logger.warn(`MongoDB Audit connection unavailable (${err.message}). Using fallback audit buffer.`);
      });
    } catch (err) {
      this.logger.warn(`Could not initialize MongoDB connection: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.mongoConnection) {
      await this.mongoConnection.close();
    }
  }

  async log(params: CreateAuditLogParams): Promise<void> {
    const timestamp = new Date();

    try {
      if (this.auditLogModel && this.mongoConnection?.readyState === 1) {
        await this.auditLogModel.create({
          ...params,
          timestamp,
        });
      } else {
        const fallbackLog = {
          _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValue: params.oldValue ?? null,
          newValue: params.newValue ?? null,
          performedBy: params.performedBy,
          userRole: params.userRole ?? 'UNKNOWN',
          ipAddress: params.ipAddress ?? '127.0.0.1',
          timestamp,
          createdAt: timestamp,
        };
        this.inMemoryLogs.unshift(fallbackLog);
        if (this.inMemoryLogs.length > 500) {
          this.inMemoryLogs.pop();
        }
      }
      this.logger.log(`[AUDIT] ${params.action} on ${params.entity}:${params.entityId} by ${params.performedBy}`);
    } catch (error) {
      this.logger.warn(`Failed to log audit event: ${(error as Error).message}`);
    }
  }

  async findAll(query?: {
    entity?: string;
    performedBy?: string;
    limit?: number;
  }): Promise<unknown[]> {
    const limit = query?.limit ? Number(query.limit) : 100;

    if (this.auditLogModel && this.mongoConnection?.readyState === 1) {
      const filter: Record<string, unknown> = {};
      if (query?.entity) filter.entity = query.entity;
      if (query?.performedBy) filter.performedBy = query.performedBy;

      return this.auditLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .exec();
    }

    let logs = [...this.inMemoryLogs];
    if (query?.entity) {
      logs = logs.filter((l) => l.entity.toLowerCase() === query.entity?.toLowerCase());
    }
    if (query?.performedBy) {
      logs = logs.filter((l) =>
        l.performedBy.toLowerCase().includes(query.performedBy?.toLowerCase() ?? ''),
      );
    }
    return logs.slice(0, limit);
  }
}
