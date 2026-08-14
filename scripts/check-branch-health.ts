import { execSync } from 'node:child_process';

function runGit(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function checkBranchHealth(): void {
  const currentBranch = runGit('git branch --show-current');
  if (!currentBranch || currentBranch === 'main' || currentBranch === 'master') {
    return;
  }

  // Check if remote tracking is gone (e.g., PR was merged and branch deleted on GitHub)
  const branchVv = runGit(`git branch -vv --list ${currentBranch}`);
  const isGone = branchVv.includes(': gone]');

  // Check if current branch is fully merged into origin/main
  let isMergedIntoMain = false;
  try {
    // If exit code is 0, HEAD is ancestor of origin/main (already merged)
    execSync('git merge-base --is-ancestor HEAD origin/main', { stdio: 'ignore' });
    isMergedIntoMain = true;
  } catch {
    isMergedIntoMain = false;
  }

  if (isMergedIntoMain || isGone) {
    const isStrict = process.argv.includes('--strict');
    console.warn('\n==================================================================');
    console.warn('⚠️  GIT BRANCH HEALTH WARNING');
    console.warn(`You are currently on branch: '${currentBranch}'`);
    if (isMergedIntoMain) {
      console.warn('👉 This branch has ALREADY BEEN MERGED into main.');
    } else if (isGone) {
      console.warn('👉 The remote branch on GitHub has been deleted (likely merged).');
    }
    console.warn('New commits made here may get stranded or lost when switching branches.');
    console.warn('\nRecommended action:');
    console.warn('  pnpm git:sync   (returns to main, pulls updates, & prunes stale branches)');
    console.warn('==================================================================\n');

    if (isStrict && process.env.ALLOW_STALE_COMMIT !== '1') {
      console.error(
        "❌ Commit blocked: Please switch to 'main' or set ALLOW_STALE_COMMIT=1 to bypass.\n",
      );
      process.exit(1);
    }
  }
}

checkBranchHealth();
