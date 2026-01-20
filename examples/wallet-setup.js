import { WalletManager } from '../src/wallet.js';

/**
 * Example: Creating and managing wallets
 *
 * SECURITY WARNINGS:
 * 1. Never commit wallet files to git
 * 2. Store private keys securely
 * 3. Use environment variables for production
 * 4. Keep backups of your keys
 * 5. Test on devnet first!
 */

async function main() {
  console.log('💼 Wallet Setup Example\n');
  console.log('🔒 SECURITY WARNING: This example shows wallet management.');
  console.log('   Never share your private keys or commit them to git!\n');

  // Initialize wallet manager (use devnet for testing)
  const DEVNET_RPC = 'https://api.devnet.solana.com';
  const walletManager = new WalletManager(DEVNET_RPC);

  console.log('='

.repeat(70));
  console.log('Option 1: Create a NEW wallet');
  console.log('='.repeat(70));

  // Create a new wallet
  const newWallet = walletManager.createWallet();
  console.log('\n✅ New wallet created!');
  console.log(`Public Key: ${newWallet.publicKey}`);
  console.log(`Private Key (base58): ${newWallet.secretKey}`);
  console.log('\n🔒 SAVE THIS PRIVATE KEY SECURELY!');
  console.log('   You will need it to access your wallet.');

  // Check balance
  const balance = await walletManager.getBalance();
  console.log(`\nWallet Balance: ${balance.toFixed(4)} SOL`);

  if (balance === 0) {
    console.log('\n💧 Requesting devnet airdrop...');
    try {
      await walletManager.airdrop(1);
      const newBalance = await walletManager.getBalance();
      console.log(`✅ New Balance: ${newBalance.toFixed(4)} SOL`);
    } catch (error) {
      console.log(`⚠️  Airdrop failed: ${error.message}`);
      console.log('   Try again later or use the Solana faucet.');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Option 2: LOAD an existing wallet');
  console.log('='.repeat(70));

  console.log('\nTo load an existing wallet, use:');
  console.log('```javascript');
  console.log('const privateKey = "your_base58_private_key_here";');
  console.log('walletManager.loadWallet(privateKey);');
  console.log('```');

  console.log('\n' + '='.repeat(70));
  console.log('Option 3: Save wallet to file (SECURE IT!)');
  console.log('='.repeat(70));

  console.log('\n⚠️  WARNING: Saving to file for demonstration only.');
  console.log('   In production, use encrypted storage!');

  // Uncomment to save (not recommended for production)
  // walletManager.saveWallet('./my-wallet.json');

  console.log('\n' + '='.repeat(70));
  console.log('Option 4: Send SOL (once you have balance)');
  console.log('='.repeat(70));

  console.log('\nTo send SOL:');
  console.log('```javascript');
  console.log('const result = await walletManager.sendSol(');
  console.log('  "recipient_address_here",');
  console.log('  0.1  // amount in SOL');
  console.log(');');
  console.log('console.log("Transaction:", result.signature);');
  console.log('```');

  console.log('\n' + '='.repeat(70));
  console.log('Using with Environment Variables (RECOMMENDED)');
  console.log('='.repeat(70));

  console.log('\n1. Add to .env file:');
  console.log('   WALLET_PRIVATE_KEY=your_base58_private_key');
  console.log('\n2. Load in your code:');
  console.log('```javascript');
  console.log('import dotenv from "dotenv";');
  console.log('dotenv.config();');
  console.log('');
  console.log('const walletManager = new WalletManager();');
  console.log('walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);');
  console.log('```');

  console.log('\n' + '='.repeat(70));
  console.log('Next Steps');
  console.log('='.repeat(70));

  console.log('\n1. Save your private key securely');
  console.log('2. Get devnet SOL from faucet: https://faucet.solana.com');
  console.log('3. Test sending transactions on devnet');
  console.log('4. Once comfortable, switch to mainnet (with caution!)');
  console.log('5. See copy-trading-bot.js for automated trading examples');

  console.log('\n💡 Wallet created and ready to use!');
  console.log(`   Address: ${newWallet.publicKey}`);
  console.log('   Network: Devnet (for testing)');

  console.log('\n🚀 To get started:');
  console.log('   1. Copy your private key above');
  console.log('   2. Add it to .env as WALLET_PRIVATE_KEY');
  console.log('   3. Run: npm run copy-trading (in dry-run mode)');
}

main().catch(console.error);
