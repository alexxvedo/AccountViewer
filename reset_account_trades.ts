import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function resetAccount(accountNumber: number) {
  console.log(`🔍 Buscando cuenta con número: ${accountNumber}...`);
  
  const account = await prisma.tradingAccount.findFirst({
    where: { accountNumber: accountNumber }
  });

  if (!account) {
    console.error('❌ Cuenta no encontrada.');
    process.exit(1);
  }

  console.log(`⚠️  Borrando trades de la cuenta ${account.nickname || account.accountNumber} (ID: ${account.id})...`);
  
  const deleted = await prisma.tradeHistory.deleteMany({
    where: { accountId: account.id }
  });

  console.log(`✅ Se han borrado ${deleted.count} trades.`);
  console.log(`💡 Ahora pulsa 'Sincronizar Todo' en tu EA de MetaTrader 5 para volver a importar los datos correctamente.`);
  
  await prisma.$disconnect();
}

const arg = process.argv[2];
if (!arg) {
  console.log('Uso: bun reset_account_trades.ts <accountNumber>');
  process.exit(1);
}

resetAccount(parseInt(arg));
