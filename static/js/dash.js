// Global variables
let clubId = '';
let joinCode = '';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing club dashboard...');

    // Get the club ID and join code from data attributes
    const dashboardElement = document.querySelector('.club-dashboard');
    if (dashboardElement) {
        clubId = dashboardElement.dataset.clubId || '';
        joinCode = dashboardElement.dataset.joinCode || '';
        console.log('Retrieved Club ID:', clubId);
        console.log('Retrieved Join Code:', joinCode);
    }

    // Removed welcome toast since notifications are working

    // Initialize navigation
    initNavigation();

    // Load initial data if club ID exists
    if (clubId) {
        loadInitialData();
    }

    // Setup settings form handler
    setupSettingsForm();
});

// Utility function to safely escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to create DOM elements safely
function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

// Initialize navigation - only target sidebar nav links
function initNavigation() {
    console.log('Setting up sidebar navigation...');

    // IMPORTANT: Only target the sidebar navigation links, not the top navbar
    const sidebarNavLinks = document.querySelectorAll('.dashboard-sidebar .nav-link');
    console.log('Found sidebar nav links:', sidebarNavLinks.length);

    sidebarNavLinks.forEach(link => {
        // Remove existing listeners by cloning and replacing
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);

        // Add direct onclick property (most reliable method)
        newLink.onclick = function(e) {
            e.preventDefault();
            console.log('Sidebar nav link clicked!'); 
            const section = this.getAttribute('data-section');
            console.log('Section:', section);
            if (section) {
                openTab(section);
                return false; // Prevent default and stop propagation
            }
        };
    });

    // Leave the main navbar links alone - they should navigate to URLs

    // Open default tab or the one from URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
        openTab(hash);
    } else {
        openTab('dashboard');
    }
}

// Load initial data for the dashboard
function loadInitialData() {
    if (!clubId) return;

    loadPosts();
    loadAssignments();
    loadMeetings();
    loadProjects();
}

// Note: showToast function is provided globally in base.html
// We don't need to redefine it here

function openTab(sectionName) {
    if (!sectionName) return;

    console.log('Opening tab:', sectionName);

    // Get all sections and deactivate them
    const allSections = document.querySelectorAll('.club-section');
    allSections.forEach(section => {
        section.classList.remove('active');
    });

    // Activate the selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn('Section not found:', sectionName);
        return;
    }

    // Update navigation links
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });

    const activeNavLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }

    // Load section data
    loadSectionData(sectionName);
}


function loadSectionData(section) {
    switch(section) {
        case 'stream':
            loadPosts();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'schedule':
            loadMeetings();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'resources':
            loadResources();
            break;
        case 'pizza':
            loadClubProjectSubmissions();
            break;
        case 'shop':
            loadPurchaseRequests();
            break;
    }
}

function deletePost(postId, content) {
    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    showConfirmModal(
        `Delete post?`,
        `"${preview}"`,
        () => {
            fetch(`/api/clubs/${clubId}/posts/${postId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadPosts();
                    showToast('success', 'Post deleted successfully', 'Post Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete post', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting post', 'Error');
            });
        }
    );
}

function deleteAssignment(assignmentId, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/assignments/${assignmentId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadAssignments();
                    showToast('success', 'Assignment deleted successfully', 'Assignment Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete assignment', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting assignment', 'Error');
            });
        }
    );
}

function showQRModal() {
    if (!joinCode) {
        showToast('error', 'Join code is not available to generate QR code.', 'Error');
        console.error('Join code is undefined, cannot generate QR code.');
        return;
    }
    const joinUrl = `${window.location.origin}/join-club?code=${joinCode}`;
    const joinUrlInput = document.getElementById('joinUrl');
    if (joinUrlInput) {
        joinUrlInput.value = joinUrl;
    } else {
        console.warn('joinUrl input element not found in QR modal.');
    }

    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) {
        console.error('QR code container not found');
        return;
    }

    qrContainer.innerHTML = '';

    const canvas = document.createElement('canvas');
    qrContainer.appendChild(canvas);

    QRCode.toCanvas(canvas, joinUrl, {
        width: 200,
        margin: 2,
        color: {
            dark: '#ec3750',
            light: '#ffffff'
        }
    }, function (error) {
        if (error) {
            console.error('QR Code generation failed:', error);
            qrContainer.innerHTML = '<p style="color: #ef4444;">Failed to generate QR code</p>';
        }
    });

    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function copyJoinUrl() {
    const joinUrl = document.getElementById('joinUrl');
    joinUrl.select();
    document.execCommand('copy');
    showToast('success', 'Join code copied to clipboard!', 'Copied');
}

function generateNewJoinCode() {
    if (!clubId) {
        showToast('error', 'Cannot generate new join code: Club ID is missing.', 'Error');
        console.error('generateNewJoinCode: clubId is missing.');
        return;
    }
    showConfirmModal(
        'Generate a new join code?',
        'The old code will stop working.',
        () => {
            fetch(`/api/clubs/${clubId}/join-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.join_code) {
                    const joinCodeDisplay = document.querySelector('.join-code-display');
                    if (joinCodeDisplay) {
                        joinCodeDisplay.innerHTML = '';
                        const icon = createElement('i', 'fas fa-key');
                        joinCodeDisplay.appendChild(icon);
                        joinCodeDisplay.appendChild(document.createTextNode(' ' + data.join_code));
                    }
                    // Update the join code in the QR modal input as well
                    const qrCodeInput = document.querySelector('#qrModal input[readonly]');
                    if (qrCodeInput) {
                        qrCodeInput.value = data.join_code;
                    }
                    showToast('success', 'New join code generated!', 'Generated');
                } else {
                    showToast('error', 'Failed to generate new join code', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error generating join code', 'Error');
            });
        }
    );
}

function showConfirmModal(message, details, onConfirm) {
    const confirmMessage = document.getElementById('confirmMessage');
    if (confirmMessage) {
        confirmMessage.innerHTML = '';
        confirmMessage.appendChild(document.createTextNode(message));
        if (details) {
            confirmMessage.appendChild(createElement('br'));
            const small = createElement('small', '', details);
            confirmMessage.appendChild(small);
        }
    }
    document.getElementById('confirmModal').style.display = 'block';

    document.getElementById('confirmButton').onclick = () => {
        document.getElementById('confirmModal').style.display = 'none';
        onConfirm();
    };
}

function loadPosts() {
    if (!clubId) {
        console.warn('loadPosts: clubId is missing. Skipping fetch.');
        const postsList = document.getElementById('postsList');
        if (postsList) postsList.textContent = 'Error: Club information is unavailable to load posts.';
        return;
    }
    fetch(`/api/clubs/${clubId}/posts`)
        .then(response => response.json())
        .then(data => {
            const postsList = document.getElementById('postsList');
            postsList.innerHTML = '';

            if (data.posts && data.posts.length > 0) {
                data.posts.forEach(post => {
                    const postCard = createElement('div', 'post-card');

                    const postHeader = createElement('div', 'post-header');
                    const postAvatar = createElement('div', 'post-avatar', post.user.username[0].toUpperCase());
                    const postInfo = createElement('div', 'post-info');
                    const postUsername = createElement('h4', '', post.user.username);
                    const postDate = createElement('div', 'post-date', new Date(post.created_at).toLocaleDateString());

                    postInfo.appendChild(postUsername);
                    postInfo.appendChild(postDate);
                    postHeader.appendChild(postAvatar);
                    postHeader.appendChild(postInfo);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deletePost(${post.id}, '${post.content.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Post');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        postHeader.appendChild(deleteBtn);
                    }

                    const postContent = createElement('div', 'post-content');
                    const postText = createElement('p', '', post.content);
                    postContent.appendChild(postText);

                    postCard.appendChild(postHeader);
                    postCard.appendChild(postContent);
                    postsList.appendChild(postCard);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-stream');
                const title = createElement('h3', '', 'No posts yet');
                const description = createElement('p', '', 'Be the first to share something with your club!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                postsList.appendChild(emptyState);
            }
        })
        .catch(error => {
            showToast('error', 'Failed to load posts', 'Error');
        });
}

function createPost() {
    if (!clubId) {
        showToast('error', 'Cannot create post: Club ID is missing.', 'Error');
        console.error('createPost: clubId is missing.');
        return;
    }
    const content = document.getElementById('postContent').value;
    if (!content.trim()) {
        showToast('error', 'Please enter some content', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('postContent').value = '';
            loadPosts();
            showToast('success', 'Post created successfully', 'Post Created');
        } else {
            showToast('error', data.error || 'Failed to create post', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error creating post', 'Error');
    });
}

function openCreateAssignmentModal() {
    const modal = document.getElementById('createAssignmentModal');
    if (modal) modal.style.display = 'block';
}

function createAssignment() {
    if (!clubId) {
        showToast('error', 'Cannot create assignment: Club ID is missing.', 'Error');
        console.error('createAssignment: clubId is missing.');
        return;
    }
    const title = document.getElementById('assignmentTitle').value;
    const description = document.getElementById('assignmentDescription').value;
    const dueDate = document.getElementById('assignmentDueDate').value;
    const forAllMembers = document.getElementById('assignmentForAll').checked;

    if (!title || !description) {
        showToast('error', 'Please fill in all required fields', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/assignments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title,
            description,
            due_date: dueDate || null,
            for_all_members: forAllMembers
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('createAssignmentModal').style.display = 'none';
            document.getElementById('createAssignmentForm').reset();
            loadAssignments();
            showToast('success', 'Assignment created successfully', 'Assignment Created');
        } else {
            showToast('error', data.error || 'Failed to create assignment', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error creating assignment', 'Error');
    });
}

function loadAssignments() {
    if (!clubId) {
        console.warn('loadAssignments: clubId is missing. Skipping fetch.');
        const assignmentsList = document.getElementById('assignmentsList');
        if (assignmentsList) assignmentsList.textContent = 'Error: Club information is unavailable to load assignments.';
        return;
    }
    fetch(`/api/clubs/${clubId}/assignments`)
        .then(response => response.json())
        .then(data => {
            const assignmentsList = document.getElementById('assignmentsList');
            const assignmentsCount = document.getElementById('assignmentsCount');

            assignmentsList.innerHTML = '';

            if (data.assignments && data.assignments.length > 0) {
                data.assignments.forEach(assignment => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', assignment.title);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';

                    const statusSpan = createElement('span', '', assignment.status);
                    statusSpan.style.cssText = `background: ${assignment.status === 'active' ? '#10b981' : '#6b7280'}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;`;

                    headerDiv.appendChild(title);
                    headerDiv.appendChild(statusSpan);
                    cardHeader.appendChild(headerDiv);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deleteAssignmentDesktop(${assignment.id}, '${assignment.title.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Assignment');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        cardHeader.appendChild(deleteBtn);
                    }

                    const cardBody = createElement('div', 'card-body');
                    const description = createElement('p', '', assignment.description);
                    description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                    cardBody.appendChild(description);

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    if (assignment.due_date) {
                        const dueSpan = createElement('span');
                        dueSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const dueIcon = createElement('i', 'fas fa-calendar');
                        dueSpan.appendChild(dueIcon);
                        dueSpan.appendChild(document.createTextNode(' Due: ' + new Date(assignment.due_date).toLocaleDateString()));
                        infoDiv.appendChild(dueSpan);
                    }

                    const membersSpan = createElement('span');
                    membersSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const membersIcon = createElement('i', 'fas fa-users');
                    membersSpan.appendChild(membersIcon);
                    membersSpan.appendChild(document.createTextNode(' ' + (assignment.for_all_members ? 'All members' : 'Selected members')));
                    infoDiv.appendChild(membersSpan);

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    assignmentsList.appendChild(card);
                });

                assignmentsCount.textContent = data.assignments.filter(a => a.status === 'active').length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-clipboard-list');
                const title = createElement('h3', '', 'No assignments yet');
                const description = createElement('p', '', 'Create your first assignment to get started!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                assignmentsList.appendChild(emptyState);

                assignmentsCount.textContent = '0';
            }
        })
        .catch(error => {
            showToast('error', 'Failed to load assignments', 'Error');
        });
}

// Opening the create meeting modal
function openCreateMeetingModal() {
    // Close edit modal if it's open
    if (typeof closeEditMeetingModal === 'function') {
        closeEditMeetingModal();
    }

    // Clear form fields
    const form = document.getElementById('createMeetingForm');
    if (form) form.reset();

    // Show the modal
    const modal = document.getElementById('createMeetingModal');
    if (modal) modal.style.display = 'block';
}

function createMeeting() {
    if (!clubId) {
        showToast('error', 'Cannot create meeting: Club ID is missing.', 'Error');
        console.error('createMeeting: clubId is missing.');
        return;
    }
    const title = document.getElementById('meetingTitle').value;
    const description = document.getElementById('meetingDescription').value;
    const date = document.getElementById('meetingDate').value;
    const startTime = document.getElementById('meetingStartTime').value;
    const endTime = document.getElementById('meetingEndTime').value;
    const location = document.getElementById('meetingLocation').value;
    const link = document.getElementById('meetingLink').value;

    if (!title || !date || !startTime) {
        showToast('error', 'Please fill in all required fields', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/meetings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title,
            description,
            meeting_date: date,
            start_time: startTime,
            end_time: endTime,
            location,
            meeting_link: link
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('createMeetingModal').style.display = 'none';
            document.getElementById('createMeetingForm').reset();
            loadMeetings();
            showToast('success', 'Meeting scheduled successfully', 'Meeting Scheduled');
        } else {
            showToast('error', data.error || 'Failed to schedule meeting', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error scheduling meeting', 'Error');
    });
}

function loadMeetings() {
    if (!clubId) {
        console.warn('loadMeetings: clubId is missing. Skipping fetch.');
        const meetingsList = document.getElementById('meetingsList');
        if (meetingsList) meetingsList.textContent = 'Error: Club information is unavailable to load meetings.';
        return;
    }
    fetch(`/api/clubs/${clubId}/meetings`)
        .then(response => response.json())
        .then(data => {
            const meetingsList = document.getElementById('meetingsList');
            const meetingsCount = document.getElementById('meetingsCount');

            meetingsList.innerHTML = '';

            if (data.meetings && data.meetings.length > 0) {
                data.meetings.forEach(meeting => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';
                    card.id = `meeting-${meeting.id}`;

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', meeting.title);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    headerDiv.appendChild(title);
                    cardHeader.appendChild(headerDiv);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deleteMeetingDesktop(${meeting.id}, '${meeting.title.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Meeting');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        cardHeader.appendChild(deleteBtn);
                    }

                    const cardBody = createElement('div', 'card-body');

                    if (meeting.description) {
                        const description = createElement('p', '', meeting.description);
                        description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                        cardBody.appendChild(description);
                    }

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const dateSpan = createElement('span');
                    dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const dateIcon = createElement('i', 'fas fa-calendar');
                    dateSpan.appendChild(dateIcon);
                    dateSpan.appendChild(document.createTextNode(' ' + new Date(meeting.meeting_date).toLocaleDateString()));
                    infoDiv.appendChild(dateSpan);

                    const timeSpan = createElement('span');
                    timeSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const timeIcon = createElement('i', 'fas fa-clock');
                    timeSpan.appendChild(timeIcon);
                    const timeText = meeting.start_time + (meeting.end_time ? ` - ${meeting.end_time}` : '');
                    timeSpan.appendChild(document.createTextNode(' ' + timeText));
                    infoDiv.appendChild(timeSpan);

                    if (meeting.location) {
                        const locationSpan = createElement('span');
                        locationSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const locationIcon = createElement('i', 'fas fa-map-marker-alt');
                        locationSpan.appendChild(locationIcon);
                        locationSpan.appendChild(document.createTextNode(' ' + meeting.location));
                        infoDiv.appendChild(locationSpan);
                    }

                    if (meeting.meeting_link) {
                        const linkSpan = createElement('span');
                        linkSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const linkIcon = createElement('i', 'fas fa-link');
                        linkSpan.appendChild(linkIcon);
                        linkSpan.appendChild(document.createTextNode(' '));

                        const link = createElement('a');
                        link.href = meeting.meeting_link;
                        link.target = '_blank';
                        link.style.color = '#ec3750';
                        link.textContent = 'Visit Resource';
                        linkSpan.appendChild(link);
                        infoDiv.appendChild(linkSpan);
                    }

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    meetingsList.appendChild(card);
                });

                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                const thisMonthMeetings = data.meetings.filter(m => {
                    const meetingDate = new Date(m.meeting_date);
                    return meetingDate.getMonth() === thisMonth && meetingDate.getFullYear() === thisYear;
                });
                meetingsCount.textContent = thisMonthMeetings.length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-calendar-times');
                const title = createElement('h3', '', 'No meetings scheduled');
                const description = createElement('p', '', 'Schedule your first club meeting to get started!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                meetingsList.appendChild(emptyState);

                meetingsCount.textContent = '0';
            }
        })
        .catch(error => {
            showToast('error', 'Failed to load meetings', 'Error');
        });
}

function editMeeting(id, title, description, date, startTime, endTime, location, link) {
    // Populate edit form
    document.getElementById('meetingTitle').value = title;
    document.getElementById('meetingDescription').value = description;
    document.getElementById('meetingDate').value = date;
    document.getElementById('meetingStartTime').value = startTime;
    document.getElementById('meetingEndTime').value = endTime;
    document.getElementById('meetingLocation').value = location;
    document.getElementById('meetingLink').value = link;

    // Change form action to update
    document.getElementById('createMeetingModal').setAttribute('data-edit-id', id);
    document.querySelector('#createMeetingModal .modal-header h3').textContent = 'Edit Meeting';
    const submitBtn = document.querySelector('#createMeetingModal .btn-primary');
    submitBtn.textContent = '';
    const icon = createElement('i', 'fas fa-save');
    submitBtn.appendChild(icon);
    submitBtn.appendChild(document.createTextNode(' Update Meeting'));
    submitBtn.setAttribute('onclick', 'updateMeeting()');

    const modal = document.getElementById('createMeetingModal');
    if (modal) modal.style.display = 'block';
}

function updateMeeting() {
    const id = document.getElementById('createMeetingModal').getAttribute('data-edit-id');
    const title = document.getElementById('meetingTitle').value;
    const description = document.getElementById('meetingDescription').value;
    const date = document.getElementById('meetingDate').value;
    const startTime = document.getElementById('meetingStartTime').value;
    const endTime = document.getElementById('meetingEndTime').value;
    const location = document.getElementById('meetingLocation').value;
    const link = document.getElementById('meetingLink').value;

    if (!title || !date || !startTime) {
        showToast('error', 'Please fill in all required fields', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/meetings/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title,
            description,
            meeting_date: date,
            start_time: startTime,
            end_time: endTime,
            location,
            meeting_link: link
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            closeEditMeetingModal();
            loadMeetings();
            showToast('success', 'Meeting updated successfully', 'Meeting Updated');
        } else {
            showToast('error', data.error || 'Failed to update meeting', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error updating meeting', 'Error');
    });
}

function deleteMeeting(id, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/meetings/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    loadMeetings();
                    showToast('success', 'Meeting deleted successfully', 'Meeting Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete meeting', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting meeting', 'Error');
            });
        }
    );
}

function closeEditMeetingModal() {
    const modal = document.getElementById('createMeetingModal');
    if (modal){
        modal.style.display = 'none';
        modal.removeAttribute('data-edit-id');
    }
    document.querySelector('#createMeetingModal .modal-header h3').textContent = 'Schedule Meeting';
    const submitBtn = document.querySelector('#createMeetingModal .btn-primary');
    submitBtn.textContent = '';
    const icon = createElement('i', 'fas fa-calendar-plus');
    submitBtn.appendChild(icon);
    submitBtn.appendChild(document.createTextNode(' Schedule Meeting'));
    submitBtn.setAttribute('onclick', 'createMeeting()');
    document.getElementById('createMeetingForm').reset();
}

// This comment is kept to maintain line numbers, but the duplicate function has been removed

function loadProjects() {
    if (!clubId) {
        console.warn('loadProjects: clubId is missing. Skipping fetch.');
        const projectsList = document.getElementById('projects-list'); // Ensure this ID matches your HTML
        if (projectsList) projectsList.textContent = 'Error: Club information is unavailable to load projects.';
        return;
    }
    fetch(`/api/clubs/${clubId}/projects`)
        .then(response => response.json())
        .then(data => {
            const projectsList = document.getElementById('projectsList');
            const projectsCount = document.getElementById('projectsCount');

            projectsList.innerHTML = '';

            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(project => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', project.name);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    headerDiv.appendChild(title);

                    if (project.featured) {
                        const featuredSpan = createElement('span', '', 'Featured');
                        featuredSpan.style.cssText = 'background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;';
                        headerDiv.appendChild(featuredSpan);
                    }

                    cardHeader.appendChild(headerDiv);

                    const cardBody = createElement('div', 'card-body');
                    const description = createElement('p', '', project.description || 'No description available');
                    description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                    cardBody.appendChild(description);

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const ownerSpan = createElement('span');
                    ownerSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const ownerIcon = createElement('i', 'fas fa-user');
                    ownerSpan.appendChild(ownerIcon);
                    ownerSpan.appendChild(document.createTextNode(' ' + project.owner.username));
                    infoDiv.appendChild(ownerSpan);

                    const dateSpan = createElement('span');
                    dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const dateIcon = createElement('i', 'fas fa-calendar');
                    dateSpan.appendChild(dateIcon);
                    dateSpan.appendChild(document.createTextNode(' ' + new Date(project.updated_at).toLocaleDateString()));
                    infoDiv.appendChild(dateSpan);

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    projectsList.appendChild(card);
                });

                projectsCount.textContent = data.projects.length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-code');
                const title = createElement('h3', '', 'No projects yet');
                const description = createElement('p', '', 'Members can start creating projects to showcase here!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                projectsList.appendChild(emptyState);

                projectsCount.textContent = '0';
            }
        })
        .catch(error => {
            showToast('error', 'Failed to load projects', 'Error');
        });
}

// Opening the add resource modal
function openAddResourceModal() {
    // Close edit modal if it's open
    if (typeof closeEditResourceModal === 'function') {
        closeEditResourceModal();
    }

    // Clear form fields
    const form = document.getElementById('addResourceForm');
    if (form) form.reset();

    // Show the modal
    const modal = document.getElementById('addResourceModal');
    if (modal) modal.style.display = 'block';
}

function addResource() {
    if (!clubId) {
        showToast('error', 'Cannot add resource: Club ID is missing.', 'Error');
        console.error('addResource: clubId is missing.');
        return;
    }
    const title = document.getElementById('resourceTitle').value;
    const url = document.getElementById('resourceUrl').value;
    const description = document.getElementById('resourceDescription').value;
    const icon = document.getElementById('resourceIcon').value;

    if (!title || !url) {
        showToast('error', 'Please fill in title and URL', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/resources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title,
            url,
            description,
            icon
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('addResourceModal').style.display = 'none';
            document.getElementById('addResourceForm').reset();
            loadResources();
            showToast('success', 'Resource added successfully', 'Resource Added');
        } else {
            showToast('error', data.error || 'Failed to add resource', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error adding resource', 'Error');
    });
}

function loadResources() {
    if (!clubId) {
        console.warn('loadResources: clubId is missing. Skipping fetch.');
        const resourcesList = document.getElementById('resourcesList');
        if (resourcesList) resourcesList.textContent = 'Error: Club information is unavailable to load resources.';
        return;
    }
    fetch(`/api/clubs/${clubId}/resources`)
        .then(response => response.json())
        .then(data => {
            const resourcesList = document.getElementById('resourcesList');
            resourcesList.innerHTML = '';

            if (data.resources && data.resources.length > 0) {
                data.resources.forEach(resource => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';
                    card.id = `resource-${resource.id}`;

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3');
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    const icon = createElement('i', `fas fa-${resource.icon}`);
                    title.appendChild(icon);
                    title.appendChild(document.createTextNode(' ' + resource.title));
                    headerDiv.appendChild(title);
                    cardHeader.appendChild(headerDiv);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deleteResourceDesktop(${resource.id}, '${resource.title.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Resource');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        cardHeader.appendChild(deleteBtn);
                    }

                    const cardBody = createElement('div', 'card-body');

                    if (resource.description) {
                        const description = createElement('p', '', resource.description);
                        description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                        cardBody.appendChild(description);
                    }

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const linkSpan = createElement('span');
                    linkSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const linkIcon = createElement('i', 'fas fa-link');
                    linkSpan.appendChild(linkIcon);
                    linkSpan.appendChild(document.createTextNode(' '));

                    const link = createElement('a');
                    link.href = resource.url;
                    link.target = '_blank';
                    link.style.color = '#ec3750';
                    link.textContent = 'Visit Resource';
                    linkSpan.appendChild(link);
                    infoDiv.appendChild(linkSpan);

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    resourcesList.appendChild(card);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-book');
                const title = createElement('h3', '', 'No resources yet');
                const description = createElement('p', '', 'Add helpful links and learning materials for your club!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                resourcesList.appendChild(emptyState);
            }
        })
        .catch(error => {
            showToast('error', 'Failed to load resources', 'Error');
        });
}

function editResource(id, title, url, description, icon) {
    // Populate edit form
    document.getElementById('resourceTitle').value = title;
    document.getElementById('resourceUrl').value = url;
    document.getElementById('resourceDescription').value = description;
    document.getElementById('resourceIcon').value = icon;

    // Change form action to update
    document.getElementById('addResourceModal').setAttribute('data-edit-id', id);
    document.querySelector('#addResourceModal .modal-header h3').textContent = 'Edit Resource';
    const submitBtn = document.querySelector('#addResourceModal .btn-primary');
    submitBtn.textContent = '';
    const saveIcon = createElement('i', 'fas fa-save');
    submitBtn.appendChild(saveIcon);
    submitBtn.appendChild(document.createTextNode(' Update Resource'));
    submitBtn.setAttribute('onclick', 'updateResource()');
    const modal = document.getElementById('addResourceModal');
    if (modal) modal.style.display = 'block';
}

function updateResource() {
    const id = document.getElementById('addResourceModal').getAttribute('data-edit-id');
    const title = document.getElementById('resourceTitle').value;
    const url = document.getElementById('resourceUrl').value;
    const description = document.getElementById('resourceDescription').value;
    const icon = document.getElementById('resourceIcon').value;

    if (!title || !url) {
        showToast('error', 'Please fill in title and URL', 'Validation Error');
        return;
    }

    fetch(`/api/clubs/${clubId}/resources/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title,
            url,
            description,
            icon
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            closeEditResourceModal();
            loadResources();
            showToast('success', 'Resource updated successfully', 'Resource Updated');
        } else {
            showToast('error', data.error || 'Failed to update resource', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error updating resource', 'Error');
    });
}

function deleteResource(id, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/resources/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    loadResources();showToast('success', 'Resource deleted successfully', 'Resource Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete resource', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting resource', 'Error');
            });
        }
    );
}

function closeEditResourceModal() {
    const modal = document.getElementById('addResourceModal');
    if(modal){
        modal.style.display = 'none';
        modal.removeAttribute('data-edit-id');
    }
    document.querySelector('#addResourceModal .modal-header h3').textContent = 'Add Resource';
    const submitBtn = document.querySelector('#addResourceModal .btn-primary');
    submitBtn.textContent = '';
    const addIcon = createElement('i', 'fas fa-plus');
    submitBtn.appendChild(addIcon);
    submitBtn.appendChild(document.createTextNode(' Add Resource'));
    submitBtn.setAttribute('onclick', 'addResource()');
    document.getElementById('addResourceForm').reset();
}

// This comment is kept to maintain line numbers, but the duplicate function has been removed

// Pizza Grant functionality
function openPizzaGrantModal() {
    const modal = document.getElementById('pizzaGrantModal');
    if (modal) {
        modal.style.display = 'block';
        // Auto-fill user data
        loadMemberData(document.getElementById('grantMemberSelect').value);
        loadMemberHackatimeProjects();
    }
}

function loadMemberData(userId) {
    if (!userId) {
        // Clear all fields if no user selected
        document.getElementById('grantFirstName').value = '';
        document.getElementById('grantLastName').value = '';
        document.getElementById('grantEmail').value = '';
        document.getElementById('grantBirthday').value = '';
        return;
    }

    // Fetch user data from API
    fetch(`/api/user/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Clear fields if error
                document.getElementById('grantFirstName').value = '';
                document.getElementById('grantLastName').value = '';
                document.getElementById('grantEmail').value = '';
                document.getElementById('grantBirthday').value = '';
            } else {
                // Populate fields with user data
                document.getElementById('grantFirstName').value = data.first_name || '';
                document.getElementById('grantLastName').value = data.last_name || '';
                document.getElementById('grantEmail').value = data.email || '';
                document.getElementById('grantBirthday').value = data.birthday || '';
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            // Clear fields on error
            document.getElementById('grantFirstName').value = '';
            document.getElementById('grantLastName').value = '';
            document.getElementById('grantEmail').value = '';
            document.getElementById('grantBirthday').value = '';
        });
}

function loadMemberHackatimeProjects() {
    const userId = document.getElementById('grantMemberSelect').value;
    const projectSelect = document.getElementById('grantProjectSelect');

    if (!userId) {
        projectSelect.innerHTML = '<option value="">Select your project</option>';
        return;
    }

    projectSelect.innerHTML = '<option value="">Loading projects...</option>';

    fetch(`/api/hackatime/projects/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                projectSelect.innerHTML = '<option value="">No Hackatime projects found</option>';
                return;
            }

            projectSelect.innerHTML = '<option value="">Select your project</option>';

            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({
                        name: project.name,
                        total_seconds: project.total_seconds,
                        formatted_time: project.formatted_time
                    });
                    option.textContent = `${project.name} (${project.formatted_time})`;
                    projectSelect.appendChild(option);
                });
            } else {
                projectSelect.innerHTML = '<option value="">No projects found</option>';
            }
        })
        .catch(error => {
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
        });
}

function updateGrantAmount() {
    // This function was referenced in HTML but not defined
    // Since we removed grant amount display, this is now a no-op
    console.log('Grant amount calculation removed as requested');
}


function openPizzaGrantModal() {
    const modal = document.getElementById('cardGrantModal');
    if (modal) {
        modal.style.display = 'block';
        // Auto-fill user data
        loadMemberData(document.getElementById('grantMemberSelect').value);
        loadMemberHackatimeProjects();
    }
}

function submitCardGrant() {
    const projectSelect = document.getElementById('grantProjectSelect');
    let projectData = null;

    if (projectSelect.value) {
        try {
            projectData = JSON.parse(projectSelect.value);
        } catch (e) {
            showToast('error', 'Invalid project selection', 'Validation Error');
            return;
        }
    }

    // Handle screenshot upload first
    const screenshotFile = document.getElementById('grantScreenshot').files[0];
    if (!screenshotFile) {
        showToast('error', 'Please upload a screenshot', 'Validation Error');
        return;
    }

    // Show loading state
    const submitButton = document.querySelector('#cardGrantModal .btn-primary');
    const originalText = submitButton.textContent;
    submitButton.textContent = '';
    const spinner = createElement('i', 'fas fa-spinner fa-spin');
    submitButton.appendChild(spinner);
    submitButton.appendChild(document.createTextNode(' Uploading...'));
    submitButton.disabled = true;

    // Upload screenshot to CDN first
    const formData = new FormData();
    formData.append('screenshot', screenshotFile);

    fetch('/api/upload-screenshot', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(uploadData => {
        if (!uploadData.success) {
            throw new Error(uploadData.error || 'Failed to upload screenshot');
        }

        // Now submit the grant with the CDN URL
        submitGrantWithScreenshot(uploadData.url, projectData, submitButton, originalText);
    })
    .catch(error => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        showToast('error', error.message || 'Error uploading screenshot', 'Upload Error');
    });
}

function submitGrantWithScreenshot(screenshotUrl, projectData, submitButton, originalText) {

    const formData = {
        member_id: document.getElementById('grantMemberSelect').value,
        project_name: projectData ? projectData.name : document.getElementById('grantProjectSelect').selectedOptions[0]?.text || '',
        project_hours: projectData ? (projectData.total_seconds / 3600).toFixed(2) : '0',
        first_name: document.getElementById('grantFirstName').value,
        last_name: document.getElementById('grantLastName').value,
        email: document.getElementById('grantEmail').value,
        birthday: document.getElementById('grantBirthday').value,
        project_description: document.getElementById('grantDescription').value,
        github_url: document.getElementById('grantGithubUrl').value,
        live_url: document.getElementById('grantLiveUrl').value,
        learning: document.getElementById('grantLearning').value,
        doing_well: document.getElementById('grantDoingWell').value,
        improve: document.getElementById('grantImprove').value,
        address_1: document.getElementById('grantAddress1').value,
        address_2: document.getElementById('grantAddress2').value,
        city: document.getElementById('grantCity').value,
        state: document.getElementById('grantState').value,
        zip: document.getElementById('grantZip').value,
        country: document.getElementById('grantCountry').value,
        screenshot_url: screenshotUrl,
        is_in_person_meeting: document.getElementById('grantInPersonMeeting').checked
    };

    // Validate URLs before submission
    const githubUrl = formData.github_url.trim();
    const liveUrl = formData.live_url.trim();

    if (!githubUrl.startsWith('http://') && !githubUrl.startsWith('https://')) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        showToast('error', 'GitHub URL must start with http:// or https://', 'Validation Error');
        return;
    }

    if (!liveUrl.startsWith('http://') && !liveUrl.startsWith('https://')) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        showToast('error', 'Live URL must start with http:// or https://', 'Validation Error');
        return;
    }

    // Validate in-person meeting requirement
    if (!formData.is_in_person_meeting) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        showToast('error', 'You must confirm this project was worked on during an in-person meeting', 'Validation Error');
        return;
    }

    // Check required fields
    const requiredFields = {
        'member_id': 'Member selection',
        'project_name': 'Project name', 
        'first_name': 'First name',
        'last_name': 'Last name',
        'email': 'Email address',
        'birthday': 'Birthday',
        'project_description': 'Project description',
        'github_url': 'GitHub URL',
        'live_url': 'Live URL',
        'learning': 'What you learned',
        'doing_well': 'What we are doing well',
        'improve': 'How we can improve',
        'address_1': 'Address line 1',
        'city': 'City',
        'state': 'State/Province',
        'zip': 'ZIP/Postal code',
        'country': 'Country'
    };

    const missingFields = [];
    for (let field in requiredFields) {
        if (!formData[field] || formData[field].toString().trim() === '') {
            missingFields.push(requiredFields[field]);
        }
    }

    if (missingFields.length > 0) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        showToast('error', `Please fill in: ${missingFields.join(', ')}`, 'Missing Fields');
        return;
    }

    submitButton.textContent = '';
    const spinner = createElement('i', 'fas fa-spinner fa-spin');
    submitButton.appendChild(spinner);
    submitButton.appendChild(document.createTextNode(' Submitting...'));

    fetch(`/api/clubs/${clubId}/pizza-grants`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;

        if (data.message) {
            document.getElementById('cardGrantModal').style.display = 'none';
            document.getElementById('cardGrantForm').reset();
            showToast('success', data.message, 'Grant Submitted');
            // Refresh the submissions list if we're on the pizza tab
            if (document.querySelector('#pizza.active')) {
                loadClubProjectSubmissions();
            }
        } else {
            showToast('error', data.error || 'Failed to submit grant', 'Error');
        }
    })
    .catch(error => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        console.error('Grant submission error:', error);
        showToast('error', error.message || 'Error submitting grant', 'Submission Failed');
    });
}

// Hackatime Projects functionality
function loadHackatimeProjects() {
    const userId = document.getElementById('hackatimeMemberSelect').value;
    const projectsList = document.getElementById('hackatimeProjectsList');

    if (!userId) {
        projectsList.innerHTML = '';
        const emptyState = createElement('div', 'empty-state');
        const icon = createElement('i', 'fas fa-clock');
        const title = createElement('h3', '', 'Select a member');
        const description = createElement('p', '', 'Choose a member from the dropdown to view their Hackatime coding projects');

        emptyState.appendChild(icon);
        emptyState.appendChild(title);
        emptyState.appendChild(description);
        projectsList.appendChild(emptyState);
        return;
    }

    projectsList.innerHTML = '';
    const loadingState = createElement('div', 'empty-state');
    const loadingIcon = createElement('i', 'fas fa-spinner fa-spin');
    const loadingTitle = createElement('h3', '', 'Loading projects...');
    const loadingDescription = createElement('p', '', 'Fetching Hackatime data');

    loadingState.appendChild(loadingIcon);
    loadingState.appendChild(loadingTitle);
    loadingState.appendChild(loadingDescription);
    projectsList.appendChild(loadingState);

    fetch(`/api/hackatime/projects/${userId}`)
        .then(response => response.json())
        .then(data => {
            projectsList.innerHTML = '';

            if (data.error) {
                const errorState = createElement('div', 'empty-state');
                const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
                errorIcon.style.color = '#f59e0b';
                const errorTitle = createElement('h3', '', 'Unable to load projects');
                const errorDescription = createElement('p', '', data.error);

                errorState.appendChild(errorIcon);
                errorState.appendChild(errorTitle);
                errorState.appendChild(errorDescription);
                projectsList.appendChild(errorState);
                return;
            }

            if (data.projects && data.projects.length > 0) {
                const title = createElement('h4', '', `${data.username}'s Hackatime Projects`);
                title.style.cssText = 'margin-bottom: 1rem; color: #1a202c;';
                projectsList.appendChild(title);

                data.projects.forEach(project => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const projectTitle = createElement('h3');
                    projectTitle.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    const codeIcon = createElement('i', 'fas fa-code');
                    projectTitle.appendChild(codeIcon);
                    projectTitle.appendChild(document.createTextNode(' ' + project.name));

                    const timeSpan = createElement('span', '', project.formatted_time);
                    timeSpan.style.cssText = 'background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-top: 0.5rem; display: inline-block;';

                    headerDiv.appendChild(projectTitle);
                    headerDiv.appendChild(timeSpan);
                    cardHeader.appendChild(headerDiv);

                    const cardBody = createElement('div', 'card-body');
                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280; margin-top: 0;';

                    const timeInfo = createElement('span');
                    timeInfo.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const clockIcon = createElement('i', 'fas fa-clock');
                    timeInfo.appendChild(clockIcon);
                    timeInfo.appendChild(document.createTextNode(` ${project.total_seconds.toLocaleString()} seconds (${project.formatted_time})`));
                    infoDiv.appendChild(timeInfo);

                    if (project.percent) {
                        const percentInfo = createElement('span');
                        percentInfo.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const chartIcon = createElement('i', 'fas fa-chart-pie');
                        percentInfo.appendChild(chartIcon);
                        percentInfo.appendChild(document.createTextNode(` ${project.percent.toFixed(1)}% of total time`));
                        infoDiv.appendChild(percentInfo);
                    }

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    projectsList.appendChild(card);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-clock');
                const title = createElement('h3', '', 'No projects found');
                const description = createElement('p', '', `${data.username} hasn't logged any coding time yet on Hackatime`);

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                projectsList.appendChild(emptyState);
            }
        })
        .catch(error => {
            projectsList.innerHTML = '';
            const errorState = createElement('div', 'empty-state');
            const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
            errorIcon.style.color = '#ef4444';
            const errorTitle = createElement('h3', '', 'Error loading projects');
            const errorDescription = createElement('p', '', 'Failed to fetch Hackatime data. Please try again.');

            errorState.appendChild(errorIcon);
            errorState.appendChild(errorTitle);
            errorState.appendChild(errorDescription);
            projectsList.appendChild(errorState);

            showToast('error', 'Failed to load Hackatime projects', 'Error');
        });
}

// Update confirmRemoveMember to use the generic removeMember function
function confirmRemoveMember(userId, username) {
    showConfirmModal(
        `Remove ${username} from the club?`,
        'This action cannot be undone.',
        () => {
            removeMember(userId);
        }
    );
}

function removeMember(userId) {
    if (!clubId) {
        showToast('error', 'Cannot remove member: Club ID is missing.', 'Error');
        console.error('removeMember: clubId is missing.');
        return;
    }
    fetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('success', 'Member removed successfully', 'Member Removed');
            // Refresh the members list if we're on that section
            if (document.querySelector('#members.active')) {
                document.querySelector(`#membersList [data-user-id="${userId}"]`)?.remove();
            }
        } else {
            showToast('error', data.message || 'Failed to remove member', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error removing member', 'Error');
    });
}

function promoteToCoLeader(userId, username) {
    showConfirmModal(
        `Make ${username} a co-leader?`,
        'Co-leaders have the same permissions as leaders except they cannot transfer leadership or remove the main leader.',
        () => {
            fetch(`/api/clubs/${clubId}/co-leader`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showToast('success', data.message, 'Co-Leader Assigned');
                    // Reload the page to update the members list
                     window.location.reload();
                } else {
                    showToast('error', data.error || 'Failed to assign co-leader', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error assigning co-leader', 'Error');
            });
        }
    );
}

function removeCoLeader() {
    showConfirmModal(
        'Remove co-leader?',
        'This will remove co-leader permissions from this member.',
        () => {
            fetch(`/api/clubs/${clubId}/co-leader`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showToast('success', data.message, 'Co-Leader Removed');
                    // Reload the page to update the members list
                     window.location.reload();
                } else {
                    showToast('error', data.error || 'Failed to remove co-leader', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error removing co-leader', 'Error');
            });
        }
    );
}

//Event listener for grantMemberSelect to load member data and Hackatime projects
const memberSelect = document.getElementById('grantMemberSelect');
    if (memberSelect) {
        memberSelect.addEventListener('change', function() {
            loadMemberData(this.value);
            loadMemberHackatimeProjects();
        });
    }

// Settings form submission handler
function setupSettingsForm() {
    const settingsForm = document.getElementById('clubSettingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateClubSettings();
        });
    }
}

function updateClubSettings(params = null, emailVerified = false) {
    if (!clubId) {
        showToast('error', 'Cannot update settings: Club ID is missing.', 'Error');
        console.error('updateClubSettings: clubId is missing.');
        return;
    }

    const clubName = document.getElementById('clubName').value;
    const clubDescription = document.getElementById('clubDescription').value;
    const clubLocation = document.getElementById('clubLocation').value;

    if (!clubName.trim()) {
        showToast('error', 'Club name is required', 'Validation Error');
        return;
    }

    const submitButton = document.querySelector('#clubSettingsForm button[type="submit"]');
    const originalText = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const requestData = {
        name: clubName.trim(),
        description: clubDescription.trim(),
        location: clubLocation.trim()
    };
    
    // Add email verification status if provided
    if (emailVerified) {
        requestData.email_verified = true;
    }
    
    fetch(`/api/clubs/${clubId}/settings`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        // Handle 403 responses (email verification required) specially
        if (response.status === 403) {
            return response.json().then(data => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                
                if (data.requires_verification) {
                    // Show email verification modal
                    showEmailVerificationModal(
                        data.verification_email,
                        'settings',
                        { function: 'updateClubSettings', params: null }
                    );
                } else {
                    showToast('error', data.error || 'Access denied', 'Error');
                }
                return null; // Signal that we handled this response
            });
        }
        
        // For all other responses, parse as JSON normally
        return response.json();
    })
    .then(data => {
        if (data === null) return; // Already handled in 403 case
        
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;

        if (data.success) {
            showToast('success', data.message || 'Club settings updated successfully!', 'Updated');
            // Update the club header if name changed
            const clubHeader = document.querySelector('.club-info h1');
            if (clubHeader) {
                clubHeader.textContent = clubName.trim();
            }
            // Update location display if it exists
            const locationElement = document.querySelector('.club-meta .location');
            if (locationElement && clubLocation.trim()) {
                locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${clubLocation.trim()}`;
            }
        } else if (data.error) {
            showToast('error', data.error, 'Error');
        } else {
            showToast('success', 'Club settings updated successfully!', 'Updated');
            // Update the club header if name changed
            const clubHeader = document.querySelector('.club-info h1');
            if (clubHeader) {
                clubHeader.textContent = clubName.trim();
            }
            // Update location display if it exists
            const locationElement = document.querySelector('.club-meta .location');
            if (locationElement && clubLocation.trim()) {
                locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${clubLocation.trim()}`;
            }
        }
    })
    .catch(error => {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
        console.error('Club settings update error:', error);
        showToast('error', 'Error updating club settings', 'Error');
    });
}

function initiateLeadershipTransfer() {
    const newLeaderSelect = document.getElementById('newLeaderSelect');
    const selectedValue = newLeaderSelect.value;

    if (!selectedValue) {
        showToast('error', 'Please select a member to transfer leadership to', 'Validation Error');
        return;
    }

    const selectedOption = newLeaderSelect.options[newLeaderSelect.selectedIndex];
    const newLeaderName = selectedOption.text.split(' (')[0];
    const newLeaderEmail = selectedOption.text.match(/\((.*?)\)/)[1];

    // Update modal content
    document.getElementById('newLeaderName').textContent = newLeaderName;
    document.getElementById('newLeaderEmail').textContent = newLeaderEmail;
    document.getElementById('newLeaderAvatar').textContent = newLeaderName.charAt(0).toUpperCase();

    // Reset confirmation input
    document.getElementById('transferConfirmationInput').value = '';
    document.getElementById('confirmTransferButton').disabled = true;

    // Show modal
    document.getElementById('transferLeadershipModal').style.display = 'block';
}

function confirmLeadershipTransfer() {
    const newLeaderSelect = document.getElementById('newLeaderSelect');
    const newLeaderId = newLeaderSelect.value;

    if (!newLeaderId) {
        showToast('error', 'No leader selected', 'Error');
        return;
    }

    const confirmButton = document.getElementById('confirmTransferButton');
    const originalText = confirmButton.innerHTML;

    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Transferring...';

    fetch(`/api/clubs/${clubId}/transfer-leadership`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            new_leader_id: newLeaderId
        })
    })
    .then(response => response.json())
    .then(data => {
        confirmButton.disabled = false;
        confirmButton.innerHTML = originalText;

        if (data.error) {
            showToast('error', data.error, 'Error');
        } else {
            showToast('success', 'Leadership transferred successfully!', 'Success');
            document.getElementById('transferLeadershipModal').style.display = 'none';
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    })
    .catch(error => {
        confirmButton.disabled = false;
        confirmButton.innerHTML = originalText;
        showToast('error', 'Error transferring leadership', 'Error');
    });
}

// Add event listener for confirmation input
document.addEventListener('DOMContentLoaded', function() {
    const transferInput = document.getElementById('transferConfirmationInput');
    const confirmButton = document.getElementById('confirmTransferButton');

    if (transferInput && confirmButton) {
        transferInput.addEventListener('input', function() {
            const isValid = this.value.trim().toUpperCase() === 'TRANSFER';
            confirmButton.disabled = !isValid;
        });
    }
});

 // Show/hide email verification modal
    function showEmailVerificationModal(email, action, callback) {
        const modal = document.getElementById('emailVerificationModal');
        const emailSpan = document.getElementById('verificationEmailDisplay');
        const codeInput = document.getElementById('verificationCodeInput');
        const verifyBtn = document.getElementById('verifyEmailBtn');
        const resendBtn = document.getElementById('resendVerificationBtn');
        const errorDiv = document.getElementById('verificationError');
        const successDiv = document.getElementById('verificationSuccess');

        if (!modal) {
            // Create modal if it doesn't exist
            createEmailVerificationModal();
            return showEmailVerificationModal(email, action, callback);
        }

        emailSpan.textContent = email;
        codeInput.value = '';

        // Clear previous messages
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        if (successDiv) {
            successDiv.style.display = 'none';
            successDiv.textContent = '';
        }

        modal.style.display = 'block';

        // Store callback for when verification succeeds
        modal.dataset.callback = JSON.stringify(callback);
        modal.dataset.action = action;

        // Auto-send verification code
        sendVerificationCode(email);
    }

    function createEmailVerificationModal() {
        const modalHTML = `
            <div id="emailVerificationModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-shield-alt"></i> Email Verification Required</h3>
                        <span class="close" onclick="closeEmailVerificationModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p>For security, we need to verify your email address before making this change.</p>
                        <p>A verification code has been sent to: <strong id="verificationEmailDisplay"></strong></p>

                        <div id="verificationError" class="error-message" style="display: none;"></div>
                        <div id="verificationSuccess" class="success-message" style="display: none;"></div>

                        <div class="form-group">
                            <label class="form-label">Enter verification code:</label>
                            <input type="text" id="verificationCodeInput" class="form-control" placeholder="Enter 5-digit code" maxlength="5" pattern="[0-9]{5}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEmailVerificationModal()">Cancel</button>
                        <button type="button" class="btn btn-secondary" id="resendVerificationBtn" onclick="resendVerificationCode()">Resend Code</button>
                        <button type="button" class="btn btn-primary" id="verifyEmailBtn" onclick="verifyEmailCode()">Verify</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
function sendVerificationCode(email) {
        const modal = document.getElementById('emailVerificationModal');
        const action = modal.dataset.action;

        let endpoint, step;

        if (window.location.pathname.includes('/verify-leader')) {
            endpoint = '/verify-leader';
            step = 'resend_code';
        } else if (action === 'settings') {
            endpoint = `/api/clubs/${clubId}/settings`;
            step = 'send_verification';
        } else if (action === 'co-leader') {
            endpoint = `/api/clubs/${clubId}/co-leader`;
             step = 'send_verification';
        } else if (action === 'make-co-leader') {
            endpoint = `/api/clubs/${clubId}/make-co-leader`;
             step = 'send_verification';
        } else if (action === 'remove-co-leader') {
            endpoint = `/api/clubs/${clubId}/remove-co-leader`;
             step = 'send_verification';
        }
         else {
            endpoint = `/api/clubs/${clubId}/settings`;
            step = 'send_verification';
        }

        fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                step: step,
                email: email
            })
        })
        .then(response => response.json())
        .then(data => {
            const successDiv = document.getElementById('verificationSuccess');
            const errorDiv = document.getElementById('verificationError');

            if (data.success) {
                if (successDiv) {
                    successDiv.textContent = data.message;
                    successDiv.style.display = 'block';
                }
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                }
            } else {
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Failed to send verification code';
                    errorDiv.style.display = 'block';
                }
                if (successDiv) {
                    successDiv.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error sending verification code:', error);
            const errorDiv = document.getElementById('verificationError');
            if (errorDiv) {
                errorDiv.textContent = 'Failed to send verification code';
                errorDiv.style.display = 'block';
            }
        });
    }

    function verifyEmailCode() {
        const modal = document.getElementById('emailVerificationModal');
        const codeInput = document.getElementById('verificationCodeInput');
        const action = modal.dataset.action;
        const code = codeInput.value.trim();

        if (!code) {
            showVerificationError('Please enter the verification code');
            return;
        }

        if (code.length !== 5) {
            showVerificationError('Please enter a valid 5-digit code');
            return;
        }

        let endpoint;

        if (window.location.pathname.includes('/verify-leader')) {
            endpoint = '/verify-leader';
        } else if (action === 'settings') {
            endpoint = `/api/clubs/${clubId}/settings`;
        } else if (action === 'co-leader') {
            endpoint = `/api/clubs/${clubId}/co-leader`;
        }  else if (action === 'make-co-leader') {
            endpoint = `/api/clubs/${clubId}/make-co-leader`;
        } else if (action === 'remove-co-leader') {
            endpoint = `/api/clubs/${clubId}/remove-co-leader`;
        }
        else {
            endpoint = `/api/clubs/${clubId}/settings`;
        }

        fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                step: 'verify_email',
                verification_code: code
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.email_verified) {
                showVerificationSuccess(data.message);

                // Close modal and execute callback
                setTimeout(() => {
                    closeEmailVerificationModal();
                    const callback = JSON.parse(modal.dataset.callback);
                    if (callback && typeof window[callback.function] === 'function') {
                        window[callback.function](callback.params, true); // true indicates email verified
                    }
                }, 1500);
            } else {
                showVerificationError(data.error || 'Verification failed');
            }
        })
        .catch(error => {
            console.error('Error verifying code:', error);
            showVerificationError('Verification failed');
        });
    }

    function resendVerificationCode() {
        const modal = document.getElementById('emailVerificationModal');
        const emailDisplay = document.getElementById('verificationEmailDisplay');
        sendVerificationCode(emailDisplay.textContent);
    }

    function closeEmailVerificationModal() {
        const modal = document.getElementById('emailVerificationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function showVerificationError(message) {
        const errorDiv = document.getElementById('verificationError');
        const successDiv = document.getElementById('verificationSuccess');

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        if (successDiv) {
            successDiv.style.display = 'none';
        }
    }

    function showVerificationSuccess(message) {
        const successDiv = document.getElementById('verificationSuccess');
        const errorDiv = document.getElementById('verificationError');

        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

function makeCoLeader(userId, emailVerified = false) {
        if (!emailVerified && !confirm('Are you sure you want to make this user a co-leader?')) return;

        fetch(`/api/clubs/${clubId}/make-co-leader`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                user_id: userId,
                email_verified: emailVerified
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.requires_verification && !emailVerified) {
                // Show email verification modal
                showEmailVerificationModal(
                    data.verification_email,
                    'make-co-leader',
                    { function: 'makeCoLeader', params: [userId] }
                );
            } else if (data.success) {
                showToast('success', data.message);
                loadMembersTab();
            } else {
                showToast('error', data.error || 'Failed to promote user');
            }
        })
        .catch(error => {
            console.error('Error making co-leader:', error);
            showToast('error', 'Failed to promote user');
        });
    }

    function removeCoLeader(params = null, emailVerified = false) {
        if (!emailVerified && !confirm('Are you sure you want to remove the co-leader?')) return;

        fetch(`/api/clubs/${clubId}/remove-co-leader`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email_verified: emailVerified
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.requires_verification && !emailVerified) {
                // Show email verification modal
                showEmailVerificationModal(
                    data.verification_email,
                    'remove-co-leader',
                    { function: 'removeCoLeader', params: null }
                );
            } else if (data.success) {
                showToast('success', data.message);
                loadMembersTab();
            } else {
                showToast('error', data.error || 'Failed to remove co-leader');
            }
        })
        .catch(error => {
            console.error('Error removing co-leader:', error);
            showToast('error', 'Failed to remove co-leader');
        });
    }


function loadClubProjectSubmissions() {
    if (!clubId) {
        console.warn('loadClubProjectSubmissions: clubId is missing. Skipping fetch.');
        const submissionsList = document.getElementById('clubSubmissionsList');
        if (submissionsList) submissionsList.textContent = 'Error: Club information is unavailable to load submissions.';
        return;
    }

    const submissionsList = document.getElementById('clubSubmissionsList');

    fetch(`/api/clubs/${clubId}/pizza-grants`)
        .then(response => response.json())
        .then(data => {
            submissionsList.innerHTML = '';

            if (data.error) {
                const errorState = createElement('div', 'empty-state');
                const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
                errorIcon.style.color = '#f59e0b';
                const errorTitle = createElement('h3', '', 'Error loading submissions');
                const errorDescription = createElement('p', '', data.error);

                errorState.appendChild(errorIcon);
                errorState.appendChild(errorTitle);
                errorState.appendChild(errorDescription);
                submissionsList.appendChild(errorState);
                return;
            }

            if (data.submissions && data.submissions.length > 0) {
                data.submissions.forEach(submission => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', submission.project_name || 'Untitled Project');
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';

                    const statusSpan = createElement('span', '', submission.status || 'Pending');
                    let statusColor = '#6b7280'; // Default gray
                    if (submission.status === 'Approved') statusColor = '#10b981'; // Green
                    else if (submission.status === 'Rejected') statusColor = '#ef4444'; // Red

                    statusSpan.style.cssText = `background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;`;

                    headerDiv.appendChild(title);
                    headerDiv.appendChild(statusSpan);
                    cardHeader.appendChild(headerDiv);

                    const grantAmountDiv = createElement('div');
                    grantAmountDiv.style.cssText = 'text-align: right;';
                    const grantAmount = createElement('div', '', submission.grant_amount || '$0');
                    grantAmount.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #ec3750;';
                    const grantLabel = createElement('div', '', 'Grant Amount');
                    grantLabel.style.cssText = 'font-size: 0.75rem; color: #6b7280; text-transform: uppercase;';
                    grantAmountDiv.appendChild(grantAmount);
                    grantAmountDiv.appendChild(grantLabel);
                    cardHeader.appendChild(grantAmountDiv);

                    const cardBody = createElement('div', 'card-body');

                    if (submission.description) {
                        const description = createElement('p', '', submission.description);
                        description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                        cardBody.appendChild(description);
                    }

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const submitterSpan = createElement('span');
                    submitterSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const submitterIcon = createElement('i', 'fas fa-user');
                    submitterSpan.appendChild(submitterIcon);
                    submitterSpan.appendChild(document.createTextNode(' ' + (submission.first_name && submission.last_name ? 
                        `${submission.first_name} ${submission.last_name}` : submission.github_username || 'Unknown')));
                    infoDiv.appendChild(submitterSpan);

                    if (submission.hours) {
                        const hoursSpan = createElement('span');
                        hoursSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const hoursIcon = createElement('i', 'fas fa-clock');
                        hoursSpan.appendChild(hoursIcon);
                        hoursSpan.appendChild(document.createTextNode(' ' + submission.hours + ' hours'));
                        infoDiv.appendChild(hoursSpan);
                    }

                    if (submission.created_time) {
                        const dateSpan = createElement('span');
                        dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const dateIcon = createElement('i', 'fas fa-calendar');
                        dateSpan.appendChild(dateIcon);
                        dateSpan.appendChild(document.createTextNode(' ' + new Date(submission.created_time).toLocaleDateString()));
                        infoDiv.appendChild(dateSpan);
                    }

                    cardBody.appendChild(infoDiv);

                    if (submission.code_url || submission.playable_url) {
                        const linksDiv = createElement('div');
                        linksDiv.style.cssText = 'margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;';

                        if (submission.code_url) {
                            const codeLink = createElement('a');
                            codeLink.href = submission.code_url;
                            codeLink.target = '_blank';
                            codeLink.className = 'btn btn-secondary btn-sm';
                            codeLink.innerHTML = '<i class="fab fa-github"></i> Code';
                            linksDiv.appendChild(codeLink);
                        }

                        if (submission.playable_url) {
                            const liveLink = createElement('a');
                            liveLink.href = submission.playable_url;
                            liveLink.target = '_blank';
                            liveLink.className = 'btn btn-secondary btn-sm';
                            liveLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Live Demo';
                            linksDiv.appendChild(liveLink);
                        }

                        cardBody.appendChild(linksDiv);
                    }

                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    submissionsList.appendChild(card);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-pizza-slice');
                const title = createElement('h3', '', 'No submissions yet');
                const description = createElement('p', '', 'Submit your coding projects to earn pizza for the club!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                submissionsList.appendChild(emptyState);
            }
        })
        .catch(error => {
            console.error('Error loading club pizza grants:', error);
            submissionsList.innerHTML = '';
            const errorState = createElement('div', 'empty-state');
            const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
            errorIcon.style.color = '#ef4444';
            const errorTitle = createElement('h3', '', 'Error loading submissions');
            const errorDescription = createElement('p', '', 'Failed to fetch pizza grant submissions. Please try again.');

            errorState.appendChild(errorIcon);
            errorState.appendChild(errorTitle);
            errorState.appendChild(errorDescription);
            submissionsList.appendChild(errorState);

            showToast('error', 'Failed to load pizza grant submissions', 'Error');
        });
}

function loadShop() {
    loadPurchaseRequests();
}

function openPurchaseRequestModal() {
    const modal = document.getElementById('purchaseRequestModal');
    if (modal) {
        modal.style.display = 'block';
        // Update balance display
        const balanceDisplay = document.getElementById('purchaseBalanceDisplay');
        if (balanceDisplay && window.clubData && window.clubData.balance) {
            balanceDisplay.textContent = `$${parseFloat(window.clubData.balance).toFixed(2)}`;
        }
    }
}

function submitPurchaseRequest() {
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    const balance = parseFloat(window.clubData?.balance || 0);

    const formData = {
        leader_first_name: document.getElementById('leaderFirstName').value,
        leader_last_name: document.getElementById('leaderLastName').value,
        leader_email: document.getElementById('leaderEmail').value,
        purchase_type: document.getElementById('purchaseType').value,
        description: document.getElementById('purchaseDescription').value,
        reason: document.getElementById('purchaseReason').value,
        fulfillment_method: document.getElementById('fulfillmentMethod').value,
        amount: amount,
        club_name: window.clubData ? window.clubData.name : ''
    };

    // Debug logging
    console.log('Desktop form data:', formData);
    console.log('Field validations:', {
        purchase_type: !!formData.purchase_type,
        description: !!formData.description,
        reason: !!formData.reason,
        fulfillment_method: !!formData.fulfillment_method,
        amount: !!formData.amount
    });

    // Check which required fields are missing
    const missingFields = [];
    if (!formData.purchase_type) missingFields.push('purchase_type');
    if (!formData.description) missingFields.push('description');
    if (!formData.reason) missingFields.push('reason');
    if (!formData.fulfillment_method) missingFields.push('fulfillment_method');
    if (!formData.amount) missingFields.push('amount');

    // Validate form - only check fields required by backend
    if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        console.log('Field values:', {
            purchase_type: formData.purchase_type,
            description: formData.description,
            reason: formData.reason,
            fulfillment_method: formData.fulfillment_method,
            amount: formData.amount
        });
        showToast('error', `Please fill in all required fields. Missing: ${missingFields.join(', ')}`, 'Validation Error');
        return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        showToast('error', 'Please enter a valid amount', 'Validation Error');
        return;
    }

    if (amount > balance) {
        showToast('error', `Amount cannot exceed club balance of $${balance.toFixed(2)}`, 'Insufficient Balance');
        return;
    }

    fetch(`/api/clubs/${clubId}/purchase-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            document.getElementById('purchaseRequestModal').style.display = 'none';
            document.getElementById('purchaseRequestForm').reset();

            // Update club balance in UI
            if (data.new_balance !== undefined) {
                const balanceDisplays = document.querySelectorAll('.balance-display');
                balanceDisplays.forEach(display => {
                    const balanceValue = display.querySelector('.balance-amount') || display;
                    if (balanceValue.textContent.includes('$')) {
                        balanceValue.textContent = `$${data.new_balance.toFixed(2)}`;
                    }
                });

                // Update window.clubData if it exists
                if (window.clubData) {
                    window.clubData.balance = data.new_balance;
                }
            }

            loadPurchaseRequests();
            showToast('success', `Purchase request submitted! New balance: $${data.new_balance.toFixed(2)}`, 'Request Submitted');
        } else {
            showToast('error', data.error || 'Failed to submit purchase request', 'Error');
        }
    })
    .catch(error => {
        showToast('error', 'Error submitting purchase request', 'Error');
    });
}

function loadPurchaseRequests() {
    if (!clubId) {
        console.warn('loadPurchaseRequests: clubId is missing. Skipping fetch.');
        return;
    }

    const requestsList = document.getElementById('purchaseRequestsList');
    if (!requestsList) return;

    requestsList.innerHTML = '';
    const loadingState = createElement('div', 'empty-state');
    const loadingIcon = createElement('i', 'fas fa-spinner fa-spin');
    const loadingTitle = createElement('h3', '', 'Loading purchase requests...');
    loadingState.appendChild(loadingIcon);
    loadingState.appendChild(loadingTitle);
    requestsList.appendChild(loadingState);

    fetch(`/api/clubs/${clubId}/purchase-requests`)
        .then(response => response.json())
        .then(data => {
            requestsList.innerHTML = '';

            if (data.error) {
                const errorState = createElement('div', 'empty-state');
                const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
                errorIcon.style.color = '#f59e0b';
                const errorTitle = createElement('h3', '', 'Error loading requests');
                const errorDescription = createElement('p', '', data.error);
                errorState.appendChild(errorIcon);
                errorState.appendChild(errorTitle);
                errorState.appendChild(errorDescription);
                requestsList.appendChild(errorState);
                return;
            }

            if (data.requests && data.requests.length > 0) {
                data.requests.forEach(request => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', `${request.purchase_type} Purchase`);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';

                    const statusSpan = createElement('span', '', request.status || 'Pending');
                    let statusColor = '#6b7280'; // Default gray
                    if (request.status === 'Approved') statusColor = '#10b981'; // Green
                    else if (request.status === 'Rejected') statusColor = '#ef4444'; // Red
                    else if (request.status === 'Fulfilled') statusColor = '#3b82f6'; // Blue

                    statusSpan.style.cssText = `background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;`;

                    headerDiv.appendChild(title);
                    headerDiv.appendChild(statusSpan);
                    cardHeader.appendChild(headerDiv);

                    const amountDiv = createElement('div');
                    amountDiv.style.cssText = 'text-align: right;';
                    const amount = createElement('div', '', `$${parseFloat(request.amount || 0).toFixed(2)}`);
                    amount.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #ec3750;';
                    const amountLabel = createElement('div', '', 'Requested');
                    amountLabel.style.cssText = 'font-size: 0.75rem; color: #6b7280; text-transform: uppercase;';
                    amountDiv.appendChild(amount);
                    amountDiv.appendChild(amountLabel);
                    cardHeader.appendChild(amountDiv);

                    const cardBody = createElement('div', 'card-body');

                    if (request.description) {
                        const description = createElement('p', '', request.description);
                        description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                        cardBody.appendChild(description);
                    }

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;';

                    const vendorSpan = createElement('span');
                    vendorSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const vendorIcon = createElement('i', 'fas fa-store');
                    vendorSpan.appendChild(vendorIcon);
                    vendorSpan.appendChild(document.createTextNode(' ' + (request.vendor || 'Unknown')));
                    infoDiv.appendChild(vendorSpan);

                    const methodSpan = createElement('span');
                    methodSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const methodIcon = createElement('i', 'fas fa-credit-card');
                    methodSpan.appendChild(methodIcon);
                    methodSpan.appendChild(document.createTextNode(' ' + (request.fulfillment_method || 'Unknown')));
                    infoDiv.appendChild(methodSpan);

                    if (request.created_time) {
                        const dateSpan = createElement('span');
                        dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const dateIcon = createElement('i', 'fas fa-calendar');
                        dateSpan.appendChild(dateIcon);
                        dateSpan.appendChild(document.createTextNode(' ' + new Date(request.created_time).toLocaleDateString()));
                        infoDiv.appendChild(dateSpan);
                    }

                    cardBody.appendChild(infoDiv);

                    if (request.reason) {
                        const reasonDiv = createElement('div');
                        reasonDiv.style.cssText = 'background: #f8fafc; border-radius: 6px; padding: 0.75rem; margin-top: 1rem;';
                        const reasonLabel = createElement('strong', '', 'Reason: ');
                        const reasonText = createElement('span', '', request.reason);
                        reasonDiv.appendChild(reasonLabel);
                        reasonDiv.appendChild(reasonText);
                        cardBody.appendChild(reasonDiv);
                    }

                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    requestsList.appendChild(card);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-shopping-cart');
                const title = createElement('h3', '', 'No purchase requests yet');
                const description = createElement('p', '', 'Submit your first purchase request to get started!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                requestsList.appendChild(emptyState);
            }
        })
        .catch(error => {
            requestsList.innerHTML = '';
            const errorState = createElement('div', 'empty-state');
            const errorIcon = createElement('i', 'fas fa-exclamation-triangle');
            errorIcon.style.color = '#ef4444';
            const errorTitle = createElement('h3', '', 'Error loading requests');
            const errorDescription = createElement('p', '', 'Failed to fetch purchase requests. Please try again.');

            errorState.appendChild(errorIcon);
            errorState.appendChild(errorTitle);
            errorState.appendChild(errorDescription);
            requestsList.appendChild(errorState);

            showToast('error', 'Failed to load purchase requests', 'Error');
        });
}

// Add hover effect styles for shop items
document.addEventListener('DOMContentLoaded', function() {
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.borderColor = '#ec3750';
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 8px 25px rgba(236, 55, 80, 0.15)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.borderColor = '#e2e8f0';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
});

// Desktop delete functions
function deletePost(postId, content) {
    showConfirmModal(
        `Delete this post?`,
        `"${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        () => {
            fetch(`/api/clubs/${clubId}/posts/${postId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadPosts();
                    showToast('success', 'Post deleted successfully', 'Post Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete post', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting post', 'Error');
            });
        }
    );
}

function deleteAssignmentDesktop(assignmentId, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/assignments/${assignmentId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadAssignments();
                    showToast('success', 'Assignment deleted successfully', 'Assignment Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete assignment', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting assignment', 'Error');
            });
        }
    );
}

function deleteMeetingDesktop(meetingId, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/meetings/${meetingId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadMeetings();
                    showToast('success', 'Meeting deleted successfully', 'Meeting Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete meeting', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting meeting', 'Error');
            });
        }
    );
}

function deleteResourceDesktop(resourceId, title) {
    showConfirmModal(
        `Delete "${title}"?`,
        'This action cannot be undone.',
        () => {
            fetch(`/api/clubs/${clubId}/resources/${resourceId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message || data.success) {
                    loadResources();
                    showToast('success', 'Resource deleted successfully', 'Resource Deleted');
                } else {
                    showToast('error', data.error || 'Failed to delete resource', 'Error');
                }
            })
            .catch(error => {
                showToast('error', 'Error deleting resource', 'Error');
            });
        }
    );
}

function loadClubData() {
    // Load posts
    fetch(`/api/clubs/${clubId}/posts`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const postsList = document.getElementById('postsList');
            postsList.innerHTML = '';

            if (data.posts && data.posts.length > 0) {
                data.posts.forEach(post => {
                    const postCard = createElement('div', 'post-card');

                    const postHeader = createElement('div', 'post-header');
                    const postAvatar = createElement('div', 'post-avatar', post.user.username[0].toUpperCase());
                    const postInfo = createElement('div', 'post-info');
                    const postUsername = createElement('h4', '', post.user.username);
                    const postDate = createElement('div', 'post-date', new Date(post.created_at).toLocaleDateString());

                    postInfo.appendChild(postUsername);
                    postInfo.appendChild(postDate);
                    postHeader.appendChild(postAvatar);
                    postHeader.appendChild(postInfo);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deletePost(${post.id}, '${post.content.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Post');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        postHeader.appendChild(deleteBtn);
                    }

                    const postContent = createElement('div', 'post-content');
                    const postText = createElement('p', '', post.content);
                    postContent.appendChild(postText);

                    postCard.appendChild(postHeader);
                    postCard.appendChild(postContent);
                    postsList.appendChild(postCard);
                });
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-stream');
                const title = createElement('h3', '', 'No posts yet');
                const description = createElement('p', '', 'Be the first to share something with your club!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                postsList.appendChild(emptyState);
            }
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            // Only show error toast if it's not a permissions issue
            if (!error.message.includes('403')) {
                showToast('error', 'Failed to load posts', 'Error');
            }
        });

    // Load assignments
    fetch(`/api/clubs/${clubId}/assignments`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const assignmentsList = document.getElementById('assignmentsList');
            const assignmentsCount = document.getElementById('assignmentsCount');

            assignmentsList.innerHTML = '';

            if (data.assignments && data.assignments.length > 0) {
                data.assignments.forEach(assignment => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', assignment.title);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';

                    const statusSpan = createElement('span', '', assignment.status);
                    statusSpan.style.cssText = `background: ${assignment.status === 'active' ? '#10b981' : '#6b7280'}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;`;

                    headerDiv.appendChild(title);
                    headerDiv.appendChild(statusSpan);
                    cardHeader.appendChild(headerDiv);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deleteAssignmentDesktop(${assignment.id}, '${assignment.title.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Assignment');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        cardHeader.appendChild(deleteBtn);
                    }

                    const cardBody = createElement('div', 'card-body');
                    const description = createElement('p', '', assignment.description);
                    description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                    cardBody.appendChild(description);

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    if (assignment.due_date) {
                        const dueSpan = createElement('span');
                        dueSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const dueIcon = createElement('i', 'fas fa-calendar');
                        dueSpan.appendChild(dueIcon);
                        dueSpan.appendChild(document.createTextNode(' Due: ' + new Date(assignment.due_date).toLocaleDateString()));
                        infoDiv.appendChild(dueSpan);
                    }

                    const membersSpan = createElement('span');
                    membersSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const membersIcon = createElement('i', 'fas fa-users');
                    membersSpan.appendChild(membersIcon);
                    membersSpan.appendChild(document.createTextNode(' ' + (assignment.for_all_members ? 'All members' : 'Selected members')));
                    infoDiv.appendChild(membersSpan);

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    assignmentsList.appendChild(card);
                });

                assignmentsCount.textContent = data.assignments.filter(a => a.status === 'active').length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-clipboard-list');
                const title = createElement('h3', '', 'No assignments yet');
                const description = createElement('p', '', 'Create your first assignment to get started!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                assignmentsList.appendChild(emptyState);

                assignmentsCount.textContent = '0';
            }
        })
        .catch(error => {
            console.error('Error loading assignments:', error);
            if (!error.message.includes('403')) {
                showToast('error', 'Failed to load assignments', 'Error');
            }
        });

    // Load meetings
    fetch(`/api/clubs/${clubId}/meetings`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const meetingsList = document.getElementById('meetingsList');
            const meetingsCount = document.getElementById('meetingsCount');

            meetingsList.innerHTML = '';

            if (data.meetings && data.meetings.length > 0) {
                data.meetings.forEach(meeting => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';
                    card.id = `meeting-${meeting.id}`;

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', meeting.title);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    headerDiv.appendChild(title);
                    cardHeader.appendChild(headerDiv);

                    // Add delete button for club leaders
                    if (window.clubData && window.clubData.isLeader) {
                        const deleteBtn = createElement('button', 'btn-icon delete-btn');
                        deleteBtn.setAttribute('onclick', `deleteMeetingDesktop(${meeting.id}, '${meeting.title.replace(/'/g, "\\'")}')`)
                        deleteBtn.setAttribute('title', 'Delete Meeting');
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        cardHeader.appendChild(deleteBtn);
                    }

                    const cardBody = createElement('div', 'card-body');

                    if (meeting.description) {
                        const description = createElement('p', '', meeting.description);
                        description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                        cardBody.appendChild(description);
                    }

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const dateSpan = createElement('span');
                    dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const dateIcon = createElement('i', 'fas fa-calendar');
                    dateSpan.appendChild(dateIcon);
                    dateSpan.appendChild(document.createTextNode(' ' + new Date(meeting.meeting_date).toLocaleDateString()));
                    infoDiv.appendChild(dateSpan);

                    const timeSpan = createElement('span');
                    timeSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const timeIcon = createElement('i', 'fas fa-clock');
                    timeSpan.appendChild(timeIcon);
                    const timeText = meeting.start_time + (meeting.end_time ? ` - ${meeting.end_time}` : '');
                    timeSpan.appendChild(document.createTextNode(' ' + timeText));
                    infoDiv.appendChild(timeSpan);

                    if (meeting.location) {
                        const locationSpan = createElement('span');
                        locationSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const locationIcon = createElement('i', 'fas fa-map-marker-alt');
                        locationSpan.appendChild(locationIcon);
                        locationSpan.appendChild(document.createTextNode(' ' + meeting.location));
                        infoDiv.appendChild(locationSpan);
                    }

                    if (meeting.meeting_link) {
                        const linkSpan = createElement('span');
                        linkSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        const linkIcon = createElement('i', 'fas fa-link');
                        linkSpan.appendChild(linkIcon);
                        linkSpan.appendChild(document.createTextNode(' '));

                        const link = createElement('a');
                        link.href = meeting.meeting_link;
                        link.target = '_blank';
                        link.style.color = '#ec3750';
                        link.textContent = 'Visit Resource';
                        linkSpan.appendChild(link);
                        infoDiv.appendChild(linkSpan);
                    }

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    meetingsList.appendChild(card);
                });

                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                const thisMonthMeetings = data.meetings.filter(m => {
                    const meetingDate = new Date(m.meeting_date);
                    return meetingDate.getMonth() === thisMonth && meetingDate.getFullYear() === thisYear;
                });
                meetingsCount.textContent = thisMonthMeetings.length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-calendar-times');
                const title = createElement('h3', '', 'No meetings scheduled');
                const description = createElement('p', '', 'Schedule your first club meeting to get started!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                meetingsList.appendChild(emptyState);

                meetingsCount.textContent = '0';
            }
        })
        .catch(error => {
            console.error('Error loading meetings:', error);
            if (!error.message.includes('403')) {
                showToast('error', 'Failed to load meetings', 'Error');
            }
        });

    // Load projects
    fetch(`/api/clubs/${clubId}/projects`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const projectsList = document.getElementById('projectsList');
            const projectsCount = document.getElementById('projectsCount');

            projectsList.innerHTML = '';

            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(project => {
                    const card = createElement('div', 'card');
                    card.style.marginBottom = '1rem';

                    const cardHeader = createElement('div', 'card-header');
                    cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start;';

                    const headerDiv = createElement('div');
                    const title = createElement('h3', '', project.name);
                    title.style.cssText = 'margin: 0; font-size: 1.125rem; color: #1f2937;';
                    headerDiv.appendChild(title);

                    if (project.featured) {
                        const featuredSpan = createElement('span', '', 'Featured');
                        featuredSpan.style.cssText = 'background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-top: 0.5rem; display: inline-block;';
                        headerDiv.appendChild(featuredSpan);
                    }

                    cardHeader.appendChild(headerDiv);

                    const cardBody = createElement('div', 'card-body');
                    const description = createElement('p', '', project.description || 'No description available');
                    description.style.cssText = 'margin-bottom: 1rem; color: #6b7280;';
                    cardBody.appendChild(description);

                    const infoDiv = createElement('div');
                    infoDiv.style.cssText = 'display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280;';

                    const ownerSpan = createElement('span');
                    ownerSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const ownerIcon = createElement('i', 'fas fa-user');
                    ownerSpan.appendChild(ownerIcon);
                    ownerSpan.appendChild(document.createTextNode(' ' + project.owner.username));
                    infoDiv.appendChild(ownerSpan);

                    const dateSpan = createElement('span');
                    dateSpan.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                    const dateIcon = createElement('i', 'fas fa-calendar');
                    dateSpan.appendChild(dateIcon);
                    dateSpan.appendChild(document.createTextNode(' ' + new Date(project.updated_at).toLocaleDateString()));
                    infoDiv.appendChild(dateSpan);

                    cardBody.appendChild(infoDiv);
                    card.appendChild(cardHeader);
                    card.appendChild(cardBody);
                    projectsList.appendChild(card);
                });

                projectsCount.textContent = data.projects.length;
            } else {
                const emptyState = createElement('div', 'empty-state');
                const icon = createElement('i', 'fas fa-code');
                const title = createElement('h3', '', 'No projects yet');
                const description = createElement('p', '', 'Members can start creating projects to showcase here!');

                emptyState.appendChild(icon);
                emptyState.appendChild(title);
                emptyState.appendChild(description);
                projectsList.appendChild(emptyState);

                projectsCount.textContent = '0';
            }
        })
        .catch(error => {
            console.error('Error loading projects:', error);
            if (!error.message.includes('403')) {
                showToast('error', 'Failed to load projects', 'Error');
            }
        });
}
//This file contains the complete javascript code for the club dashboard with the addition of co-leader functionality.