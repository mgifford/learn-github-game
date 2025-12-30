/**
 * The Git-Goat's Gazette
 * A WCAG 2.2 AA compliant GitHub learning game with 18+ stages
 * 
 * Configuration
 */

// ⚙️ CONFIGURATION: Update these values to change the target repository
// These can be changed to point to different repos without modifying the game logic
const REPO_OWNER = 'mgifford';          // GitHub username who owns the repo
const REPO_NAME = 'learn-github-game';  // Repository name (no spaces, lowercase preferred)

// Seussian comment templates for user guidance
const SEUSSIAN_TEMPLATES = {
    comment: [
        "I do! I do! I like this issue!",
        "This would be splendid! Can we make it so?",
        "I shall help you with this!",
        "What a wonderful idea!",
        "Say! I like this! Yes, I do!"
    ],
    closing: [
        "This is done! Hooray!",
        "The anchor is now loose. Problem solved!",
        "I've fixed it, and it's splendid!",
        "All done here, thank you!"
    ]
};

// API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const API_HEADERS = {
    'Accept': 'application/vnd.github.v3+json'
};

// Timing controls
const PENDING_RECHECK_INTERVAL_MS = 45000; // Re-validate pending steps every 45s
const CONNECTION_CHECK_INTERVAL_MS = 60000; // Connectivity ping interval

// Game state
let gameState = {
    username: null,
    userProfile: null,  // Cache user profile data (name, bio, followers, etc.)
    currentLevel: 0,
    completedLevels: [],
    pendingChecks: {},
    skippedStages: [],  // Track which stages user skipped
    prNumber: null,     // Store PR number for levels 16-17
};

/**
 * Initialize the game
 */
document.addEventListener('DOMContentLoaded', () => {
    restoreGameState();
    
    // Check URL hash for level navigation
    const hash = window.location.hash.slice(1);
    if (hash && isValidLevel(hash)) {
        gameState.currentLevel = getLevelNumberFromHash(hash);
    }
    
    updateUI();
    updateURLHash();

    // Event listeners for level validation
    const loginForm = document.querySelector('#level-0 form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLoginClick();
    });
    document.getElementById('login-button').addEventListener('click', handleLoginClick);
    document.getElementById('check-level-1').addEventListener('click', checkLevel1);
    document.getElementById('check-level-2').addEventListener('click', checkLevel2);
    document.getElementById('check-level-3').addEventListener('click', checkLevel3);
    document.getElementById('check-level-4').addEventListener('click', checkLevel4);
    document.getElementById('check-level-5').addEventListener('click', checkLevel5);
    document.getElementById('check-level-6').addEventListener('click', checkLevel6);
    document.getElementById('check-level-7').addEventListener('click', checkLevel7);
    document.getElementById('check-level-8').addEventListener('click', checkLevel8);
    document.getElementById('check-level-9').addEventListener('click', checkLevel9);
    document.getElementById('check-level-10').addEventListener('click', checkLevel10);
    document.getElementById('check-level-11').addEventListener('click', checkLevel11);
    document.getElementById('check-level-12').addEventListener('click', checkLevel12);
    document.getElementById('check-level-13').addEventListener('click', checkLevel13);
    document.getElementById('skip-level-13').addEventListener('click', skipLevel13);
    document.getElementById('check-level-14').addEventListener('click', checkLevel14);
    document.getElementById('check-level-15').addEventListener('click', checkLevel15);
    document.getElementById('check-level-16').addEventListener('click', checkLevel16);
    document.getElementById('check-level-17').addEventListener('click', checkLevel17);

    // Navigation buttons
    document.getElementById('prev-button').addEventListener('click', goToPreviousLevel);
    document.getElementById('next-button').addEventListener('click', goToNextLevel);
    
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && isValidLevel(hash)) {
            gameState.currentLevel = getLevelNumberFromHash(hash);
            updateUI();
        }
    });

    // Pending validations (auto re-check for delayed API indexing)
    startPendingCheckPoller();
});

/**
 * Update the entire UI based on game state
 */
function updateUI() {
    // Hide all sections
    document.querySelectorAll('.level-card, .victory-card').forEach(section => {
        section.setAttribute('hidden', '');
    });

    // Show current section
    const currentSection = document.getElementById(`level-${gameState.currentLevel}`);
    if (currentSection) {
        currentSection.removeAttribute('hidden');
        // Move focus to the section for accessibility
        const heading = currentSection.querySelector('h2');
        if (heading) {
            setTimeout(() => heading.focus(), 100);
        }
    } else if (gameState.currentLevel === 5) {
        // Victory screen
        const victorySection = document.getElementById('victory');
        victorySection.removeAttribute('hidden');
        const victoryHeading = victorySection.querySelector('h2');
        if (victoryHeading) {
            setTimeout(() => victoryHeading.focus(), 100);
        }
        // Set the profile link
        document.getElementById('profile-link').href = `https://github.com/${gameState.username}`;
    }

    // Update user status with personalized greeting
    if (gameState.username) {
        const profile = gameState.userProfile;
        const greeting = profile && profile.name 
            ? `Welcome, ${profile.name}! You have ${profile.followers} followers and ${profile.publicRepos} repositories. Splendid! You're on Level ${gameState.currentLevel}.`
            : `Welcome, ${gameState.username}! You're on Level ${gameState.currentLevel}.`;
        document.getElementById('user-status').textContent = greeting;
    }

    // Update navigation UI
    updateNavigationUI();
    
    // Update train position based on current level
    const train = document.querySelector('.seuss-train');
    if (train) {
        train.setAttribute('data-progress', gameState.currentLevel);
    }
    
    // Update URL hash to reflect current level
    updateURLHash();
}

/**
 * Update all repository links
 */

/**
 * Update the URL hash to reflect current level
 */
function updateURLHash() {
    const hash = getLevelHashName(gameState.currentLevel);
    window.history.pushState(null, null, `#${hash}`);
}

/**
 * Get hash name for a level number
 */
function getLevelHashName(levelNumber) {
    const levelNames = {
        0: 'level0',
        1: 'level1',
        2: 'level2',
        3: 'level3',
        4: 'level4',
        5: 'victory'
    };
    return levelNames[levelNumber] || 'level0';
}

/**
 * Get level number from hash string
 */
function getLevelNumberFromHash(hash) {
    const hashMap = {
        'level0': 0,
        'level1': 1,
        'level2': 2,
        'level3': 3,
        'level4': 4,
        'level5': 5,
        'victory': 5
    };
    return hashMap[hash.toLowerCase()] !== undefined ? hashMap[hash.toLowerCase()] : 0;
}

/**
 * Check if hash is a valid level
 */
function isValidLevel(hash) {
    const validLevels = ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'victory'];
    return validLevels.includes(hash.toLowerCase());
}

/**
 * Handle login (Level 0)
 */
async function handleLoginClick() {
    const input = document.getElementById('github-username');
    const username = input.value.trim();
    const errorMsg = document.getElementById('level-0-error');

    if (!username) {
        errorMsg.textContent = 'Please enter a GitHub username.';
        errorMsg.classList.add('show');
        return;
    }

    errorMsg.classList.remove('show');

    // Check if user exists
    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/users/${username}`,
            { headers: API_HEADERS }
        );

        if (response.ok) {
            const profile = await response.json();
            gameState.username = username;
            gameState.userProfile = {
                name: profile.name || profile.login,
                bio: profile.bio,
                location: profile.location,
                followers: profile.followers,
                publicRepos: profile.public_repos,
                avatarUrl: profile.avatar_url
            };
            gameState.currentLevel = 1;
            saveGameState();
            updateUI();
        } else if (response.status === 404) {
            errorMsg.textContent = `User "${username}" not found. Sign up at github.com/signup.`;
            errorMsg.classList.add('show');
        } else {
            errorMsg.textContent = 'Error checking username. Please try again.';
            errorMsg.classList.add('show');
        }
    } catch (e) {
        errorMsg.textContent = 'Network error. Please check your connection.';
        errorMsg.classList.add('show');
        console.error('Login error:', e);
    }
}

/**
 * Level 1: Check if user commented on Issue #1
 */
async function checkLevel1(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-1-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/1/comments`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const comments = await response.json();
        
        const userComment = comments.some(c => c.user.login === gameState.username);

        if (userComment) {
            markLevelCompleted(1);
            gameState.currentLevel = Math.max(gameState.currentLevel, 2);
            saveGameState();
            if (!recheck) {
                updateUI();
            }
            return true;
        }

        // If this is a background recheck, pull the player back if needed
        if (recheck) {
            markLevelPending(1);
            if (gameState.currentLevel > 1) {
                gameState.currentLevel = 1;
                saveGameState();
                updateUI();
            }
            return false;
        }

        // First-attempt failure: save as pending and allow progress
        const issueUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/1`;
        markLevelPending(1);
        gameState.currentLevel = Math.max(gameState.currentLevel, 2);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong> because GitHub may delay search.<br>We'll re-check automatically and bring you back if needed.<br><br>Verify at: <a href="${issueUrl}" target="_blank" rel="noopener">${issueUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking comments. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 1 error:', e);
        return false;
    }
}


/**
 * Level 2: Check if user created an issue with "Anchor" or "Tight" in the title
 */
async function checkLevel2(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-2-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        const foundIssue = result.items && result.items.length > 0;

        if (foundIssue) {
            markLevelCompleted(2);
            gameState.currentLevel = Math.max(gameState.currentLevel, 3);
            saveGameState();
            if (!recheck) {
                updateUI();
            }
            return true;
        }

        if (recheck) {
            markLevelPending(2);
            if (gameState.currentLevel > 2) {
                gameState.currentLevel = 2;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(2);
        gameState.currentLevel = Math.max(gameState.currentLevel, 3);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong> because GitHub search may lag 30–60s.<br>We'll re-check automatically and return you to this step if it still isn't found.<br><br>Make sure the issue is <strong>closed</strong> and includes your follow-up comment.<br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking issues. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 2 error:', e);
        return false;
    }
}

/**
 * Level 3: Edit issue title
 */
async function checkLevel3(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-3-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Find the user's issue
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            const issueNumber = issue.number;
            
            // Check if the issue has been edited (updated_at > created_at)
            const edited = await issueHasBeenEdited(issueNumber);
            
            if (edited) {
                markLevelCompleted(3);
                gameState.currentLevel = Math.max(gameState.currentLevel, 4);
                saveGameState();
                if (!recheck) {
                    updateUI();
                }
                return true;
            }
        }

        if (recheck) {
            markLevelPending(3);
            if (gameState.currentLevel > 3) {
                gameState.currentLevel = 3;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(3);
        gameState.currentLevel = Math.max(gameState.currentLevel, 4);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Make sure you've edited the issue title.<br><br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking issue edits. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 3 error:', e);
        return false;
    }
}

/**
 * Level 4: Edit issue body/description
 */
async function checkLevel4(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-4-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            const issueNumber = issue.number;
            
            // Check if the issue has been edited
            const edited = await issueHasBeenEdited(issueNumber);
            
            if (edited) {
                markLevelCompleted(4);
                gameState.currentLevel = Math.max(gameState.currentLevel, 5);
                saveGameState();
                if (!recheck) {
                    updateUI();
                }
                return true;
            }
        }

        if (recheck) {
            markLevelPending(4);
            if (gameState.currentLevel > 4) {
                gameState.currentLevel = 4;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(4);
        gameState.currentLevel = Math.max(gameState.currentLevel, 5);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Edit the issue description/body text.<br><br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking issue. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 4 error:', e);
        return false;
    }
}

/**
 * Level 5: Edit a comment
 */
async function checkLevel5(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-5-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            const issueNumber = issue.number;
            
            // Fetch comments on the issue
            const commentsUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
            const commentsResponse = await fetch(commentsUrl, { headers: API_HEADERS });
            
            if (commentsResponse.ok) {
                const comments = await commentsResponse.json();
                // Check if any user comment has been edited (updated_at > created_at)
                const editedComment = comments.find(c => 
                    c.user.login === gameState.username && 
                    new Date(c.updated_at).getTime() > new Date(c.created_at).getTime() + 1000
                );
                
                if (editedComment) {
                    markLevelCompleted(5);
                    gameState.currentLevel = Math.max(gameState.currentLevel, 6);
                    saveGameState();
                    if (!recheck) {
                        updateUI();
                    }
                    return true;
                }
            }
        }

        if (recheck) {
            markLevelPending(5);
            if (gameState.currentLevel > 5) {
                gameState.currentLevel = 5;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(5);
        gameState.currentLevel = Math.max(gameState.currentLevel, 6);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Edit one of your own comments on the issue.<br><br>Look for the ... menu on your comment and click "Edit".<br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking comments. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 5 error:', e);
        return false;
    }
}

/**
 * Level 6: Reopen and close cycle
 */
async function checkLevel6(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-6-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            const issueNumber = issue.number;
            
            // Fetch comments to check for activity after closure
            const commentsUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
            const commentsResponse = await fetch(commentsUrl, { headers: API_HEADERS });
            
            if (commentsResponse.ok) {
                const comments = await commentsResponse.json();
                // Check if there are comments from user that were posted after multiple other interactions
                const userCommentCount = comments.filter(c => c.user.login === gameState.username).length;
                
                if (userCommentCount >= 2) {  // At least opening + closing comment
                    markLevelCompleted(6);
                    gameState.currentLevel = Math.max(gameState.currentLevel, 7);
                    saveGameState();
                    if (!recheck) {
                        updateUI();
                    }
                    return true;
                }
            }
        }

        if (recheck) {
            markLevelPending(6);
            if (gameState.currentLevel > 6) {
                gameState.currentLevel = 6;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(6);
        gameState.currentLevel = Math.max(gameState.currentLevel, 7);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Reopen the issue, add a clarification comment, then close it again.<br><br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking issue state. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 6 error:', e);
        return false;
    }
}

/**
 * Level 7: Add a label
 */
async function checkLevel7(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-7-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            
            // Check if issue has at least one label
            if (issue.labels && issue.labels.length > 0) {
                markLevelCompleted(7);
                gameState.currentLevel = Math.max(gameState.currentLevel, 8);
                saveGameState();
                if (!recheck) {
                    updateUI();
                }
                return true;
            }
        }

        if (recheck) {
            markLevelPending(7);
            if (gameState.currentLevel > 7) {
                gameState.currentLevel = 7;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(7);
        gameState.currentLevel = Math.max(gameState.currentLevel, 8);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Add a label to your issue from the Labels section.<br><br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking labels. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 7 error:', e);
        return false;
    }
}

/**
 * Level 8: Self-assign the issue
 */
async function checkLevel8(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-8-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue state:closed author:${gameState.username} "Anchor" OR "Tight"`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.items && result.items.length > 0) {
            const issue = result.items[0];
            
            // Check if assigned to the user
            const assigned = await issueIsAssignedToUser(issue.number, gameState.username);
            
            if (assigned) {
                markLevelCompleted(8);
                gameState.currentLevel = Math.max(gameState.currentLevel, 9);
                saveGameState();
                if (!recheck) {
                    updateUI();
                }
                return true;
            }
        }

        if (recheck) {
            markLevelPending(8);
            if (gameState.currentLevel > 8) {
                gameState.currentLevel = 8;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const issuesUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`;
        markLevelPending(8);
        gameState.currentLevel = Math.max(gameState.currentLevel, 9);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>. Assign the issue to yourself from the Assignees section.<br><br>Verify at: <a href="${issuesUrl}" target="_blank" rel="noopener">${issuesUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking assignment. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 8 error:', e);
        return false;
    }
}

/**
 * Level 9: Check if LICENSE file exists in repo (renamed from Level 3)
 */
async function checkLevel9() {
    const errorMsg = document.getElementById('level-9-error');
    errorMsg.classList.remove('show');

    try {
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/LICENSE`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (response.ok) {
            markLevelCompleted(9);
            gameState.currentLevel = 10;
            saveGameState();
            updateUI();
        } else if (response.status === 404) {
            errorMsg.textContent = 'LICENSE file not found. Create it in your repository and try again.';
            errorMsg.classList.add('show');
        } else {
            throw new Error(`GitHub API error: ${response.status}`);
        }
    } catch (e) {
        errorMsg.textContent = 'Error checking LICENSE file. Please try again.';
        errorMsg.classList.add('show');
        console.error('Level 9 error:', e);
    }
}

/**
 * Level 10: Check if user has an open Pull Request (renamed from Level 4)
 */
async function checkLevel10(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-10-error');
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:pr author:${gameState.username} is:open`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        const foundPR = result.items && result.items.length > 0;

        if (foundPR) {
            markLevelCompleted(10);
            gameState.currentLevel = 5; // Victory!
            saveGameState();
            if (!recheck) {
                updateUI();
            }
            return true;
        }

        if (recheck) {
            markLevelPending(10);
            if (gameState.currentLevel > 10) {
                gameState.currentLevel = 10;
                saveGameState();
                updateUI();
            }
            return false;
        }

        const prsUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/pulls`;
        markLevelPending(10);
        gameState.currentLevel = Math.max(gameState.currentLevel, 5);
        saveGameState();
        errorMsg.innerHTML = `Saved as <strong>pending</strong>—PR search can take 30–60s.<br>We'll re-check automatically and bring you back if your PR isn't found.<br><br>Verify at: <a href="${prsUrl}" target="_blank" rel="noopener">${prsUrl}</a>`;
        errorMsg.classList.add('show');
        updateUI();
        return false;
    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking Pull Requests. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 10 error:', e);
        return false;
    }
}

/**
 * Level 11: Fork the repository
 * Checks if user has forked the git-goat-gazette repo
 */
async function checkLevel11(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-11-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Check if fork exists
        const forkUrl = `https://api.github.com/repos/${gameState.username}/git-goat-gazette`;
        const response = await fetch(forkUrl, { headers: API_HEADERS });

        if (response.status === 404) {
            if (!recheck) {
                errorMsg.textContent = 'Fork not found yet. Click the Fork button on CivicActions/git-goat-gazette and try again!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const fork = await response.json();
        
        // Verify it's actually a fork
        if (!fork.fork) {
            if (!recheck) {
                errorMsg.textContent = 'Found your repository, but it doesn\'t appear to be a fork. Make sure to use the Fork button!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success!
        gameState.currentLevel = 12;
        gameState.completedLevels.push(11);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking fork. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 11 error:', e);
        return false;
    }
}

/**
 * Level 12: Web edit a file
 * Checks if user has made a commit in their fork (web edit)
 */
async function checkLevel12(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-12-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Get commits from the fork
        const commitsUrl = `https://api.github.com/repos/${gameState.username}/git-goat-gazette/commits`;
        const response = await fetch(commitsUrl, { headers: API_HEADERS });

        if (response.status === 404) {
            if (!recheck) {
                errorMsg.textContent = 'Fork not found. Have you completed Level 11?';
                errorMsg.classList.add('show');
            }
            return false;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const commits = await response.json();
        
        // Check if there's at least one commit by the user
        const userCommit = commits.find(commit => 
            commit.commit.author.name.toLowerCase().includes(gameState.username.toLowerCase()) ||
            (commit.author && commit.author.login === gameState.username)
        );

        if (!userCommit) {
            if (!recheck) {
                errorMsg.textContent = 'No commits found yet. Edit README.md in your fork using the pencil icon and try again!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success!
        gameState.currentLevel = 13;
        gameState.completedLevels.push(12);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking commits. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 12 error:', e);
        return false;
    }
}

/**
 * Level 13: Create a branch (OPTIONAL)
 * Checks if user has created a non-main branch
 */
async function checkLevel13(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-13-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Get branches from the fork
        const branchesUrl = `https://api.github.com/repos/${gameState.username}/git-goat-gazette/branches`;
        const response = await fetch(branchesUrl, { headers: API_HEADERS });

        if (response.status === 404) {
            if (!recheck) {
                errorMsg.textContent = 'Fork not found. Have you completed Level 11?';
                errorMsg.classList.add('show');
            }
            return false;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const branches = await response.json();
        
        // Check if there's a branch other than main/master
        const customBranch = branches.find(branch => 
            branch.name !== 'main' && branch.name !== 'master'
        );

        if (!customBranch) {
            if (!recheck) {
                errorMsg.textContent = 'No custom branch found yet. Create a new branch using the branch dropdown, or click "Skip This Step" to continue!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success!
        gameState.currentLevel = 14;
        gameState.completedLevels.push(13);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking branches. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 13 error:', e);
        return false;
    }
}

/**
 * Skip Level 13 (optional branching level)
 */
function skipLevel13() {
    gameState.currentLevel = 14;
    // Don't add 13 to completedLevels (it was skipped)
    saveGameState();
    updateUI();
}

/**
 * Level 14: Make a commit (with good message)
 * Checks if user has made at least 2 commits total
 */
async function checkLevel14(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-14-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Get commits from the fork
        const commitsUrl = `https://api.github.com/repos/${gameState.username}/git-goat-gazette/commits`;
        const response = await fetch(commitsUrl, { headers: API_HEADERS });

        if (response.status === 404) {
            if (!recheck) {
                errorMsg.textContent = 'Fork not found. Have you completed Level 11?';
                errorMsg.classList.add('show');
            }
            return false;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const commits = await response.json();
        
        // Check if there are at least 2 commits by the user
        const userCommits = commits.filter(commit => 
            commit.commit.author.name.toLowerCase().includes(gameState.username.toLowerCase()) ||
            (commit.author && commit.author.login === gameState.username)
        );

        if (userCommits.length < 2) {
            if (!recheck) {
                errorMsg.textContent = `Found ${userCommits.length} commit(s). Make at least one more commit with a clear message!`;
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success!
        gameState.currentLevel = 15;
        gameState.completedLevels.push(14);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking commits. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 14 error:', e);
        return false;
    }
}

/**
 * Level 15: Open a Pull Request
 * Checks if user has opened a PR from their fork to the base repo
 */
async function checkLevel15(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-15-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Search for PRs by this user to the base repo
        const searchUrl = `https://api.github.com/search/issues?q=repo:CivicActions/git-goat-gazette+is:pr+author:${gameState.username}`;
        const response = await fetch(searchUrl, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.items || result.items.length === 0) {
            if (!recheck) {
                errorMsg.textContent = 'No Pull Request found yet. Open a PR from your fork to CivicActions/git-goat-gazette!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Store PR number for later levels
        gameState.prNumber = result.items[0].number;
        
        // Success!
        gameState.currentLevel = 16;
        gameState.completedLevels.push(15);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking Pull Requests. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 15 error:', e);
        return false;
    }
}

/**
 * Level 16: Comment on your PR
 * Checks if user has commented on their own PR
 */
async function checkLevel16(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-16-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // First, make sure we have the PR number
        if (!gameState.prNumber) {
            // Try to find it again
            const searchUrl = `https://api.github.com/search/issues?q=repo:CivicActions/git-goat-gazette+is:pr+author:${gameState.username}`;
            const searchResponse = await fetch(searchUrl, { headers: API_HEADERS });
            
            if (searchResponse.ok) {
                const searchResult = await searchResponse.json();
                if (searchResult.items && searchResult.items.length > 0) {
                    gameState.prNumber = searchResult.items[0].number;
                    saveGameState();
                } else {
                    if (!recheck) {
                        errorMsg.textContent = 'Cannot find your PR. Have you completed Level 15?';
                        errorMsg.classList.add('show');
                    }
                    return false;
                }
            }
        }

        // Get comments on the PR
        const commentsUrl = `https://api.github.com/repos/CivicActions/git-goat-gazette/issues/${gameState.prNumber}/comments`;
        const response = await fetch(commentsUrl, { headers: API_HEADERS });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const comments = await response.json();
        
        // Check if user has commented
        const userComment = comments.find(comment => comment.user.login === gameState.username);

        if (!userComment) {
            if (!recheck) {
                errorMsg.textContent = 'No comment found yet. Add a comment to your Pull Request!';
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success!
        gameState.currentLevel = 17;
        gameState.completedLevels.push(16);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking comments. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 16 error:', e);
        return false;
    }
}

/**
 * Level 17: Address feedback and update PR
 * Checks if user has made additional commits (PR has been updated)
 */
async function checkLevel17(options = {}) {
    const { recheck = false } = options;
    const errorMsg = document.getElementById('level-17-error');
    
    if (!recheck) {
        errorMsg.classList.remove('show');
    }

    try {
        // Get commits from the fork
        const commitsUrl = `https://api.github.com/repos/${gameState.username}/git-goat-gazette/commits`;
        const response = await fetch(commitsUrl, { headers: API_HEADERS });

        if (response.status === 404) {
            if (!recheck) {
                errorMsg.textContent = 'Fork not found. Have you completed Level 11?';
                errorMsg.classList.add('show');
            }
            return false;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const commits = await response.json();
        
        // Check if there are at least 3 commits by the user
        // (1 from web edit, 1 from commit level, 1+ from updates)
        const userCommits = commits.filter(commit => 
            commit.commit.author.name.toLowerCase().includes(gameState.username.toLowerCase()) ||
            (commit.author && commit.author.login === gameState.username)
        );

        if (userCommits.length < 3) {
            if (!recheck) {
                errorMsg.textContent = `Found ${userCommits.length} commit(s). Make at least one more commit to update your PR!`;
                errorMsg.classList.add('show');
            }
            return false;
        }

        // Success! Victory!
        gameState.currentLevel = 18;  // Victory screen
        gameState.completedLevels.push(17);
        saveGameState();
        
        if (!recheck) {
            updateUI();
        }
        return true;

    } catch (e) {
        if (!recheck) {
            errorMsg.textContent = 'Error checking commits. Please try again.';
            errorMsg.classList.add('show');
        }
        console.error('Level 17 error:', e);
        return false;
    }
}

/**
 * Save game state to localStorage
 */
function saveGameState() {
    localStorage.setItem('gitGoatGameState', JSON.stringify(gameState));
}

/**
 * Restore game state from localStorage
 */
function restoreGameState() {
    const saved = localStorage.getItem('gitGoatGameState');
    if (saved) {
        try {
            gameState = JSON.parse(saved);
        } catch (e) {
            console.error('Error restoring game state:', e);
        }
    }

    // Ensure required keys exist for backward compatibility
    if (!Array.isArray(gameState.completedLevels)) {
        gameState.completedLevels = [];
    }

    if (!gameState.pendingChecks || typeof gameState.pendingChecks !== 'object') {
        gameState.pendingChecks = {};
    }

    if (!Array.isArray(gameState.skippedStages)) {
        gameState.skippedStages = [];
    }

    if (!gameState.userProfile) {
        gameState.userProfile = null;
    }

    gameState.currentLevel = Number.isInteger(gameState.currentLevel) ? gameState.currentLevel : 0;
}

/**
 * Optional: Clear game state (for testing/resetting)
 */
function resetGame() {
    localStorage.removeItem('gitGoatGameState');
    gameState = {
        username: null,
        currentLevel: 0,
        completedLevels: [],
    };
    document.getElementById('github-username').value = '';
    updateUI();
}

// Make reset available globally for debugging
window.resetGame = resetGame;

// Navigation functions
function goToPreviousLevel() {
    if (gameState.currentLevel > 0) {
        gameState.currentLevel--;
        saveGameState();
        updateUI();
        console.log('Navigated to level', gameState.currentLevel);
    }
}

function goToNextLevel() {
    // Check if current level is completed before allowing navigation
    if (gameState.currentLevel < 18) {
        if (gameState.completedLevels.includes(gameState.currentLevel) || gameState.currentLevel === 0) {
            gameState.currentLevel++;
            saveGameState();
            updateUI();
            console.log('Navigated to level', gameState.currentLevel);
        } else {
            // Show stop sign and redirect
            showStopSignAndRedirect();
        }
    }
}

/**
 * Show stop sign character when user tries to skip ahead
 * Redirects to first incomplete level after 5 seconds
 */
function showStopSignAndRedirect() {
    const modal = document.getElementById('stop-sign-modal');
    const countdown = document.getElementById('redirect-countdown');
    
    modal.removeAttribute('hidden');
    
    let secondsLeft = 5;
    countdown.textContent = secondsLeft;
    
    const countdownInterval = setInterval(() => {
        secondsLeft--;
        countdown.textContent = secondsLeft;
        
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            modal.setAttribute('hidden', '');
            
            // Find first incomplete level
            let targetLevel = 0;
            for (let i = 0; i <= 17; i++) {
                if (!gameState.completedLevels.includes(i)) {
                    targetLevel = i;
                    break;
                }
            }
            
            // Navigate to first incomplete level
            gameState.currentLevel = targetLevel;
            saveGameState();
            updateUI();
        }
    }, 1000);
}

/**
 * Show stop sign character when user tries to skip ahead
 * Redirects to first incomplete level after 5 seconds
 */
function showStopSignAndRedirect() {
    const modal = document.getElementById('stop-sign-modal');
    const countdown = document.getElementById('redirect-countdown');
    
    modal.removeAttribute('hidden');
    
    let secondsLeft = 5;
    countdown.textContent = secondsLeft;
    
    const countdownInterval = setInterval(() => {
        secondsLeft--;
        countdown.textContent = secondsLeft;
        
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            modal.setAttribute('hidden', '');
            
            // Find first incomplete level
            let targetLevel = 0;
            for (let i = 0; i <= 17; i++) {
                if (!gameState.completedLevels.includes(i)) {
                    targetLevel = i;
                    break;
                }
            }
            
            // Navigate to first incomplete level
            gameState.currentLevel = targetLevel;
            saveGameState();
            updateUI();
        }
    }, 1000);
}

// Update navigation buttons visibility
function updateNavigationUI() {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const levelCounter = document.getElementById('level-counter');

    // Update level indicator
    levelCounter.textContent = gameState.currentLevel;

    // Show/hide prev button (hide only on level 0, allow going back from victory)
    prevButton.hidden = gameState.currentLevel === 0;

    // Show/hide next button (hide only at victory level 18)
    nextButton.hidden = gameState.currentLevel === 18;

    // Disable next button if level not completed (unless already completed)
    if (gameState.currentLevel < 18 && gameState.currentLevel > 0) {
        const isCompleted = isLevelCompleted(gameState.currentLevel);
        const isPending = hasPendingCheck(gameState.currentLevel);
        nextButton.disabled = !(isCompleted || isPending);
    } else {
        nextButton.disabled = false;
    }
}

// Completion helpers
function markLevelCompleted(level) {
    if (!gameState.completedLevels.includes(level)) {
        gameState.completedLevels.push(level);
    }
    if (gameState.pendingChecks[level]) {
        delete gameState.pendingChecks[level];
    }
}

function markLevelPending(level) {
    gameState.pendingChecks[level] = { lastChecked: Date.now() };
    saveGameState();
}

function isLevelCompleted(level) {
    return gameState.completedLevels.includes(level);
}

function hasPendingCheck(level) {
    return Boolean(gameState.pendingChecks[level]);
}

// Pending revalidation loop
function startPendingCheckPoller() {
    processPendingChecks();
    setInterval(processPendingChecks, PENDING_RECHECK_INTERVAL_MS);
}

async function processPendingChecks() {
    if (!gameState.pendingChecks || Object.keys(gameState.pendingChecks).length === 0) {
        return;
    }

    const now = Date.now();
    for (const [levelKey, meta] of Object.entries(gameState.pendingChecks)) {
        const lastChecked = meta?.lastChecked || 0;
        if (now - lastChecked < 5000) {
            continue; // Skip overly frequent checks
        }
        await recheckLevel(parseInt(levelKey, 10));
    }
}

async function recheckLevel(level) {
    if (gameState.pendingChecks[level]) {
        gameState.pendingChecks[level].lastChecked = Date.now();
        saveGameState();
    }

    switch (level) {
        case 1:
            return checkLevel1({ recheck: true });
        case 2:
            return checkLevel2({ recheck: true });
        case 3:
            return checkLevel3({ recheck: true });
        case 4:
            return checkLevel4({ recheck: true });
        case 5:
            return checkLevel5({ recheck: true });
        case 6:
            return checkLevel6({ recheck: true });
        case 7:
            return checkLevel7({ recheck: true });
        case 8:
            return checkLevel8({ recheck: true });
        case 10:
            return checkLevel10({ recheck: true });
        case 11:
            return checkLevel11({ recheck: true });
        case 12:
            return checkLevel12({ recheck: true });
        case 14:
            return checkLevel14({ recheck: true });
        case 15:
            return checkLevel15({ recheck: true });
        case 16:
            return checkLevel16({ recheck: true });
        case 17:
            return checkLevel17({ recheck: true });
        default:
            return false;
    }
}

// Connectivity indicator
function startConnectionPoller() {
    setInterval(checkConnectivity, CONNECTION_CHECK_INTERVAL_MS);
}

async function checkConnectivity() {
    if (!navigator.onLine) {
        updateConnectionIndicator(false, 'Offline');
        return;
    }

    try {
        const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, { headers: API_HEADERS, cache: 'no-store' });
        updateConnectionIndicator(response.ok, response.ok ? 'Connected to GitHub' : 'GitHub unreachable');
    } catch (e) {
        updateConnectionIndicator(false, 'Network unavailable');
        console.error('Connectivity check failed:', e);
    }
}

function updateConnectionIndicator(isOnline, message) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    if (!dot || !text) return;

    dot.classList.toggle('status-online', isOnline);
    dot.classList.toggle('status-offline', !isOnline);
    text.textContent = message || (isOnline ? 'Connected' : 'Offline');
}

// Helper to get Seussian comment template
function getSeussianTemplate(type = 'comment') {
    const templates = SEUSSIAN_TEMPLATES[type] || SEUSSIAN_TEMPLATES.comment;
    return templates[Math.floor(Math.random() * templates.length)];
}

// Check if user already has an issue in repo (for skipping stage)
async function checkForExistingUserIssue(username) {
    try {
        const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue author:${username}`;
        const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: API_HEADERS });
        if (response.ok) {
            const result = await response.json();
            return result.items && result.items.length > 0;
        }
    } catch (e) {
        console.error('Error checking for existing issue:', e);
    }
    return false;
}

// Check if issue has been edited (updated_at > created_at)
async function issueHasBeenEdited(issueNumber) {
    try {
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
        const response = await fetch(url, { headers: API_HEADERS });
        if (response.ok) {
            const issue = await response.json();
            const created = new Date(issue.created_at).getTime();
            const updated = new Date(issue.updated_at).getTime();
            return updated > created + 1000; // Account for 1s precision
        }
    } catch (e) {
        console.error('Error checking if issue was edited:', e);
    }
    return false;
}

// Check if issue has a specific label
async function issueHasLabel(issueNumber, labelName) {
    try {
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
        const response = await fetch(url, { headers: API_HEADERS });
        if (response.ok) {
            const issue = await response.json();
            return issue.labels.some(label => label.name.toLowerCase() === labelName.toLowerCase());
        }
    } catch (e) {
        console.error('Error checking if issue has label:', e);
    }
    return false;
}

// Check if issue is assigned to user
async function issueIsAssignedToUser(issueNumber, username) {
    try {
        const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
        const response = await fetch(url, { headers: API_HEADERS });
        if (response.ok) {
            const issue = await response.json();
            return issue.assignee && issue.assignee.login === username;
        }
    } catch (e) {
        console.error('Error checking if issue is assigned to user:', e);
    }
    return false;
}