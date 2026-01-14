import bcrypt from 'bcrypt';

async function generateHashes() {
  const passwords = {
    admin: 'admin123',
    superadmin: 'superadmin123',
    alice: 'password123',
    bob: 'password456'
  };

  console.log('-- Generated password hashes for migrations:');
  for (const [user, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`-- ${user}`);
    console.log(`'${hash}',\n`);
  }
}

generateHashes().catch(console.error);
