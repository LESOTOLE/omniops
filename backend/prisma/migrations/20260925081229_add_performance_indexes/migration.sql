-- CreateIndex
CREATE INDEX `inventories_quantity_idx` ON `inventories`(`quantity`);

-- CreateIndex
CREATE INDEX `orders_createdAt_idx` ON `orders`(`createdAt`);

-- CreateIndex
CREATE INDEX `orders_warehouseId_createdAt_idx` ON `orders`(`warehouseId`, `createdAt`);

-- CreateIndex
CREATE INDEX `products_category_idx` ON `products`(`category`);

-- CreateIndex
CREATE INDEX `stock_transfers_status_idx` ON `stock_transfers`(`status`);
