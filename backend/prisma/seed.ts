import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'sell_medicine', name: 'Sell Medicine', module: 'sales' },
  { code: 'view_sales', name: 'View Sales', module: 'sales' },
  { code: 'create_purchase', name: 'Create Purchase', module: 'purchasing' },
  { code: 'approve_purchase', name: 'Approve Purchase', module: 'purchasing' },
  { code: 'view_purchases', name: 'View Purchases', module: 'purchasing' },
  { code: 'dispose_stock', name: 'Dispose Stock', module: 'inventory' },
  { code: 'approve_disposal', name: 'Approve Disposal', module: 'inventory' },
  { code: 'adjust_stock', name: 'Adjust Stock', module: 'inventory' },
  { code: 'approve_adjustment', name: 'Approve Adjustment', module: 'inventory' },
  { code: 'view_reports', name: 'View Reports', module: 'reports' },
  { code: 'manage_products', name: 'Manage Products', module: 'inventory' },
  { code: 'manage_users', name: 'Manage Users', module: 'admin' },
  { code: 'manage_roles', name: 'Manage Roles', module: 'admin' },
  { code: 'view_audit_logs', name: 'View Audit Logs', module: 'admin' },
];

async function main() {
  console.log('Seeding database...');

  // Create permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
  }
  console.log('Created permissions');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    create: { name: 'Administrator', description: 'Full system access' },
    update: {},
  });

  const pharmacistRole = await prisma.role.upsert({
    where: { name: 'Pharmacist' },
    create: { name: 'Pharmacist', description: 'Sales, dispensing, approvals' },
    update: {},
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    create: { name: 'Cashier', description: 'Point of sale only' },
    update: {},
  });

  const stockRole = await prisma.role.upsert({
    where: { name: 'Stock Clerk' },
    create: { name: 'Stock Clerk', description: 'Purchasing and inventory' },
    update: {},
  });

  // Assign all permissions to admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    });
  }

  // Assign permissions to pharmacist
  const pharmacistPerms = ['sell_medicine', 'view_sales', 'approve_purchase', 'approve_disposal', 'approve_adjustment', 'view_reports', 'manage_products'];
  for (const code of pharmacistPerms) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: pharmacistRole.id, permissionId: perm.id } },
        create: { roleId: pharmacistRole.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Assign permissions to cashier
  const cashierPerms = ['sell_medicine', 'view_sales'];
  for (const code of cashierPerms) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: cashierRole.id, permissionId: perm.id } },
        create: { roleId: cashierRole.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Assign permissions to stock clerk
  const stockPerms = ['create_purchase', 'view_purchases', 'dispose_stock', 'adjust_stock', 'manage_products', 'view_reports'];
  for (const code of stockPerms) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: stockRole.id, permissionId: perm.id } },
        create: { roleId: stockRole.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pharmacy.com' },
    create: {
      email: 'admin@pharmacy.com',
      passwordHash,
      name: 'System Administrator',
      isActive: true,
    },
    update: { passwordHash },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });

  // Create sample supplier
  const existingSupplier = await prisma.supplier.findFirst({
    where: { name: 'Main Pharmaceutical Supplier' },
  });
  if (!existingSupplier) {
    await prisma.supplier.create({
      data: {
        name: 'Main Pharmaceutical Supplier',
        contact: 'John Doe',
        email: 'supplier@pharma.com',
        phone: '+1234567890',
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
