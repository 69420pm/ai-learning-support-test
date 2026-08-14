import { execSync } from 'node:child_process';

function syncGit(): void {
  console.log('🔄 1. Switching to main branch...');
  execSync('git checkout main', { stdio: 'inherit' });

  console.log('📥 2. Fetching and pulling latest changes from origin/main...');
  execSync('git pull origin main', { stdio: 'inherit' });

  console.log('🧹 3. Pruning deleted remote branches...');
  execSync('git remote prune origin', { stdio: 'inherit' });

  console.log('🌲 4. Pruning stale git worktrees...');
  execSync('git worktree prune', { stdio: 'inherit' });

  console.log('🔍 5. Cleaning up local branches that are already merged into main...');
  try {
    const mergedBranches = execSync('git branch --merged main', { encoding: 'utf-8' })
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0 && !b.startsWith('*') && b !== 'main' && b !== 'master');

    if (mergedBranches.length > 0) {
      for (const branch of mergedBranches) {
        console.log(`   Deleting local merged branch: ${branch}`);
        try {
          execSync(`git branch -d ${branch}`, { stdio: 'pipe' });
        } catch {
          // If -d failed due to missing upstream tracking, use -D since --merged main already proved it's merged
          execSync(`git branch -D ${branch}`, { stdio: 'inherit' });
        }
      }
    } else {
      console.log('   No stale local merged branches to delete.');
    }
  } catch {
    // ignore if no branches found
  }

  console.log("\n✅ Workspace is fully synced on 'main' and ready for development!\n");
}

syncGit();
