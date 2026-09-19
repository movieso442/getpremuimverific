import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

// 1. Profiles / Users Table
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id'),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  balanceXaf: numeric('balance_xaf', { precision: 12, scale: 2 }).default('0.00'),
  currency: text('currency').default('XAF'),
  avatarUrl: text('avatar_url'),
  phoneNumber: text('phone_number'),
  role: text('role').default('client'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

// 2. Wallet Transactions Table
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(), // 'deposit', 'sms_purchase', 'smm_order', 'account_purchase', 'refund'
  paymentMethod: text('payment_method').notNull(), // 'mtn_momo', 'orange_money', 'visa_mastercard', 'crypto_usdt'
  reference: text('reference').notNull().unique(),
  status: text('status').default('completed').notNull(), // 'pending', 'completed', 'failed', 'refunded'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 3. Virtual SMS Orders Table
export const smsOrders = pgTable('sms_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  serviceName: text('service_name').notNull(),
  serviceCode: text('service_code').notNull(),
  countryName: text('country_name').notNull(),
  countryCode: text('country_code').notNull(),
  phoneNumber: text('phone_number').notNull(),
  smsCode: text('sms_code'),
  priceXaf: numeric('price_xaf', { precision: 12, scale: 2 }).notNull(),
  status: text('status').default('waiting_sms').notNull(), // 'waiting_sms', 'received', 'expired', 'canceled'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 4. SMM Services Catalog Table (Synced from JustAnotherPanel API)
export const smmServices = pgTable('smm_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: integer('service_id').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  rateUsd: numeric('rate_usd', { precision: 10, scale: 4 }).notNull(),
  rateXaf: numeric('rate_xaf', { precision: 12, scale: 2 }).notNull(),
  min: integer('min').notNull(),
  max: integer('max').notNull(),
  dripfeed: boolean('dripfeed').default(false),
  refill: boolean('refill').default(false),
  cancel: boolean('cancel').default(false),
  serviceType: text('service_type').default('Default'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

// 5. SMM Orders Table
export const smmOrders = pgTable('smm_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull(),
  serviceName: text('service_name').notNull(),
  category: text('category').notNull(),
  targetLink: text('target_link').notNull(),
  quantity: integer('quantity').notNull(),
  chargeXaf: numeric('charge_xaf', { precision: 12, scale: 2 }).notNull(),
  startCount: integer('start_count').default(0),
  remains: integer('remains').default(0),
  status: text('status').default('pending').notNull(), // 'pending', 'processing', 'in_progress', 'completed', 'canceled', 'partial'
  apiOrderId: text('api_order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 6. Account Orders Table
export const accountOrders = pgTable('account_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  itemTitle: text('item_title').notNull(),
  category: text('category').notNull(),
  priceXaf: numeric('price_xaf', { precision: 12, scale: 2 }).notNull(),
  deliveryType: text('delivery_type').default('instant').notNull(),
  credentialsData: jsonb('credentials_data'),
  status: text('status').default('completed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 7. Developer API Keys Table
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  keyName: text('key_name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 8. Webhook Endpoints Table
export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: jsonb('events').notNull(),
  secret: text('secret').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// 9. Virtual SMS Services Catalog Table
export const smsServices = pgTable('sms_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceCode: text('service_code').notNull().unique(),
  serviceName: text('service_name').notNull(),
  category: text('category').default('SMS Verification').notNull(),
  countryName: text('country_name').default('United Kingdom').notNull(),
  countryCode: text('country_code').default('GB').notNull(),
  priceXaf: numeric('price_xaf', { precision: 12, scale: 2 }).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})
