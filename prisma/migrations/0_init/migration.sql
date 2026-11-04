-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MEN', 'WOMEN', 'UNISEX');

-- CreateEnum
CREATE TYPE "size" AS ENUM ('XS', 'S', 'M', 'L', 'XL');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "shipping_method" AS ENUM ('STANDARD', 'EXPRESS');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CARD', 'EWALLET', 'COD');

-- CreateEnum
CREATE TYPE "return_reason" AS ENUM ('SIZE_DIDNT_FIT', 'NOT_AS_PICTURED', 'DAMAGED', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "return_status" AS ENUM ('REQUESTED', 'APPROVED', 'RECEIVED', 'REJECTED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" "role" NOT NULL DEFAULT 'CUSTOMER',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fabric" TEXT,
    "fit_notes" TEXT,
    "gender" "gender" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "image_url" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "product_id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "content_type" TEXT NOT NULL,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "variant" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "size" "size" NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_item" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saved_for_later" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bag_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "unit" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'PROCESSING',
    "shipping_cents" INTEGER NOT NULL,
    "shipping_method" "shipping_method" NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "card_last4" TEXT,
    "tracking_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_address" (
    "order_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "unit" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,

    CONSTRAINT "shipping_address_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "color_name" TEXT NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "order_status" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "return_status" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_item" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "return_reason" NOT NULL,

    CONSTRAINT "return_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "store_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "color_name_key" ON "color"("name");

-- CreateIndex
CREATE UNIQUE INDEX "color_slug_key" ON "color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_category_id_gender_idx" ON "product"("category_id", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "variant_sku_key" ON "variant"("sku");

-- CreateIndex
CREATE INDEX "variant_size_stock_idx" ON "variant"("size", "stock");

-- CreateIndex
CREATE UNIQUE INDEX "variant_product_id_color_id_size_key" ON "variant"("product_id", "color_id", "size");

-- CreateIndex
CREATE UNIQUE INDEX "bag_item_user_id_variant_id_key" ON "bag_item"("user_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_number_key" ON "order"("number");

-- CreateIndex
CREATE INDEX "order_user_id_status_idx" ON "order"("user_id", "status");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant" ADD CONSTRAINT "variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant" ADD CONSTRAINT "variant_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_item" ADD CONSTRAINT "bag_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_item" ADD CONSTRAINT "bag_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_address" ADD CONSTRAINT "shipping_address_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request" ADD CONSTRAINT "return_request_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules Prisma can't express in the schema.
ALTER TABLE "product" ADD CONSTRAINT "product_price_cents_check" CHECK ("price_cents" >= 0);
ALTER TABLE "variant" ADD CONSTRAINT "variant_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "bag_item" ADD CONSTRAINT "bag_item_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order" ADD CONSTRAINT "order_shipping_cents_check" CHECK ("shipping_cents" >= 0);
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_unit_price_cents_check" CHECK ("unit_price_cents" >= 0);
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_quantity_check" CHECK ("quantity" > 0);

-- store_setting holds a single row.
ALTER TABLE "store_setting" ADD CONSTRAINT "store_setting_id_check" CHECK ("id" = 1);
ALTER TABLE "store_setting" ADD CONSTRAINT "store_setting_low_stock_threshold_check" CHECK ("low_stock_threshold" >= 0);
