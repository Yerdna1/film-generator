require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearStuckJobs() {
  try {
    console.log('Checking for stuck scene generation jobs...\n');

    // Find all pending/processing jobs
    const stuckJobs = await prisma.sceneGenerationJob.findMany({
      where: {
        status: { in: ['pending', 'processing'] },
      },
    });

    if (stuckJobs.length === 0) {
      console.log('✓ No stuck jobs found!');
      return;
    }

    console.log(`Found ${stuckJobs.length} stuck job(s):\n`);
    stuckJobs.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Project ID: ${job.projectId}`);
      console.log(`   User ID: ${job.userId}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Total Scenes: ${job.totalScenes}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log('');
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question('Delete these stuck jobs? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled. No jobs were deleted.');
      return;
    }

    // Delete stuck jobs
    const result = await prisma.sceneGenerationJob.deleteMany({
      where: {
        status: { in: ['pending', 'processing'] },
      },
    });

    console.log(`\n✓ Deleted ${result.count} stuck job(s)!`);
    console.log('You can now try generating scenes again.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearStuckJobs();
