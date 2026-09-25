import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  action: string; // e.g. "CREATE", "UPDATE", "DELETE", "STOCK_TRANSFER", "CHECKOUT"

  @Prop({ required: true })
  entity: string; // e.g. "Product", "Warehouse", "Inventory", "Order", "User"

  @Prop({ required: true })
  entityId: string;

  @Prop({ type: Object, default: null })
  oldValue: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  newValue: Record<string, unknown> | null;

  @Prop({ required: true })
  performedBy: string; // User email or ID

  @Prop({ required: false, default: null })
  userRole?: string;

  @Prop({ required: false, default: null })
  ipAddress?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
