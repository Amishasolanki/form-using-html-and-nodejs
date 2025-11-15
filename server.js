const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory storage for form submissions (in production, use a database)
let formSubmissions = [];
let submissionStats = {
    totalSubmissions: 0,
    submissionsToday: 0,
    submissionsThisWeek: 0,
    submissionsThisMonth: 0
};

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Validation schema using Joi
const formSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    birthdate: Joi.date().optional(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    country: Joi.string().valid('', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in', 'other').optional(),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
    interests: Joi.array().items(Joi.string().valid('sports', 'music', 'technology', 'travel', 'reading', 'cooking')).optional(),
    website: Joi.string().uri().optional(),
    age: Joi.number().integer().min(1).max(120).optional(),
    appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    favoriteColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    experience: Joi.number().integer().min(1).max(10).optional(),
    bio: Joi.string().max(500).optional()
});

// Helper function to update submission statistics
function updateSubmissionStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    submissionStats.totalSubmissions = formSubmissions.length;
    submissionStats.submissionsToday = formSubmissions.filter(sub => new Date(sub.submittedAt) >= today).length;
    submissionStats.submissionsThisWeek = formSubmissions.filter(sub => new Date(sub.submittedAt) >= weekAgo).length;
    submissionStats.submissionsThisMonth = formSubmissions.filter(sub => new Date(sub.submittedAt) >= monthAgo).length;
}

// Helper function to calculate detailed statistics
function calculateDetailedStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const stats = {
        totalSubmissions: formSubmissions.length,
        submissionsToday: formSubmissions.filter(sub => new Date(sub.submittedAt) >= today).length,
        submissionsThisWeek: formSubmissions.filter(sub => new Date(sub.submittedAt) >= weekAgo).length,
        submissionsThisMonth: formSubmissions.filter(sub => new Date(sub.submittedAt) >= monthAgo).length,
        countryDistribution: {},
        genderDistribution: {},
        interestsDistribution: {},
        averageAge: 0,
        averageExperience: 0
    };
    
    // Calculate distributions
    formSubmissions.forEach(sub => {
        if (sub.country) {
            stats.countryDistribution[sub.country] = (stats.countryDistribution[sub.country] || 0) + 1;
        }
        if (sub.gender) {
            stats.genderDistribution[sub.gender] = (stats.genderDistribution[sub.gender] || 0) + 1;
        }
        if (sub.interests) {
            sub.interests.forEach(interest => {
                stats.interestsDistribution[interest] = (stats.interestsDistribution[interest] || 0) + 1;
            });
        }
    });
    
    // Calculate averages
    const ages = formSubmissions.filter(sub => sub.age).map(sub => sub.age);
    const experiences = formSubmissions.filter(sub => sub.experience).map(sub => sub.experience);
    
    stats.averageAge = ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : 0;
    stats.averageExperience = experiences.length > 0 ? (experiences.reduce((a, b) => a + b, 0) / experiences.length).toFixed(1) : 0;
    
    return stats;
}

// Helper function to convert array of objects to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

// GET route for main form page (server-side rendered)
app.get('/', (req, res) => {
    const stats = calculateDetailedStats();
    const recentSubmissions = formSubmissions
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 3);
    
    res.render('form', {
        title: 'User Input Forms',
        subtitle: 'Comprehensive form examples with various input types',
        message: req.query.message || null,
        showStats: true,
        stats: stats,
        showRecentSubmissions: true,
        recentSubmissions: recentSubmissions
    });
});

// POST endpoint to handle form submissions
app.post('/submit-form', (req, res) => {
    try {
        // Validate form data
        const { error, value } = formSchema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true 
        });

        if (error) {
            // Render error message page with server-side rendering
            return res.render('message', {
                title: 'Validation Failed',
                subtitle: 'Please correct the errors below',
                success: false,
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                    value: detail.context.value
                })),
                showAdminLink: false
            });
        }

        // Create submission object
        const submission = {
            id: uuidv4(),
            ...value,
            submittedAt: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };

        // Store submission
        formSubmissions.push(submission);
        updateSubmissionStats();

        // Log submission
        console.log('📝 New form submission:', {
            id: submission.id,
            name: `${submission.firstName} ${submission.lastName}`,
            email: submission.email,
            timestamp: submission.submittedAt
        });

        // Render success message page with server-side rendering
        res.render('message', {
            title: 'Form Submitted Successfully!',
            subtitle: 'Thank you for your submission',
            success: true,
            data: {
                id: submission.id,
                name: `${submission.firstName} ${submission.lastName}`,
                email: submission.email,
                submittedAt: submission.submittedAt
            },
            showAdminLink: true
        });

    } catch (err) {
        console.error('❌ Error processing form submission:', err);
        res.render('message', {
            title: 'Server Error',
            subtitle: 'Something went wrong while processing your form',
            success: false,
            errors: [{ field: 'server', message: 'Internal server error' }],
            showAdminLink: false
        });
    }
});

// GET route for admin dashboard (server-side rendered)
app.get('/admin', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    
    // Sort submissions by date (newest first)
    const sortedSubmissions = [...formSubmissions].sort((a, b) => 
        new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    
    // Paginate
    const paginatedSubmissions = sortedSubmissions.slice(startIndex, startIndex + limitNum);
    
    const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(formSubmissions.length / limitNum),
        totalSubmissions: formSubmissions.length,
        hasNext: startIndex + limitNum < formSubmissions.length,
        hasPrev: pageNum > 1
    };
    
    const stats = calculateDetailedStats();
    
    res.render('admin', {
        title: 'Admin Dashboard',
        subtitle: 'Manage form submissions and view analytics',
        submissions: paginatedSubmissions,
        pagination: pagination,
        stats: stats
    });
});

// GET all submissions with pagination and sorting (API endpoint)
app.get('/api/submissions', (req, res) => {
    const { page = 1, limit = 10, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    
    // Sort submissions
    const sortedSubmissions = [...formSubmissions].sort((a, b) => {
        if (sortOrder === 'asc') {
            return new Date(a[sortBy]) - new Date(b[sortBy]);
        } else {
            return new Date(b[sortBy]) - new Date(a[sortBy]);
        }
    });
    
    // Paginate
    const paginatedSubmissions = sortedSubmissions.slice(startIndex, startIndex + limitNum);
    
    res.json({
        success: true,
        data: paginatedSubmissions.map(submission => ({
            id: submission.id,
            name: `${submission.firstName} ${submission.lastName}`,
            email: submission.email,
            country: submission.country,
            interests: submission.interests,
            submittedAt: submission.submittedAt
        })),
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(formSubmissions.length / limitNum),
            totalSubmissions: formSubmissions.length,
            hasNext: startIndex + limitNum < formSubmissions.length,
            hasPrev: pageNum > 1
        }
    });
});

// GET specific submission by ID
app.get('/api/submissions/:id', (req, res) => {
    const { id } = req.params;
    const submission = formSubmissions.find(sub => sub.id === id);
    
    if (!submission) {
        return res.status(404).json({
            success: false,
            message: 'Submission not found'
        });
    }
    
    // Remove sensitive data
    const { password, confirmPassword, ...safeSubmission } = submission;
    
    res.json({
        success: true,
        data: safeSubmission
    });
});

// PUT endpoint to update a submission
app.put('/api/submissions/:id', (req, res) => {
    const { id } = req.params;
    const submissionIndex = formSubmissions.findIndex(sub => sub.id === id);
    
    if (submissionIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Submission not found'
        });
    }
    
    // Validate update data (excluding required fields that shouldn't change)
    const updateSchema = formSchema.fork(
        ['firstName', 'lastName', 'email', 'username', 'password', 'confirmPassword'],
        (schema) => schema.optional()
    );
    
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    
    // Update submission
    formSubmissions[submissionIndex] = {
        ...formSubmissions[submissionIndex],
        ...value,
        updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Submission updated:', { id, updatedAt: formSubmissions[submissionIndex].updatedAt });
    
    res.json({
        success: true,
        message: 'Submission updated successfully',
        data: formSubmissions[submissionIndex]
    });
});

// DELETE endpoint to remove a submission
app.delete('/api/submissions/:id', (req, res) => {
    const { id } = req.params;
    const submissionIndex = formSubmissions.findIndex(sub => sub.id === id);
    
    if (submissionIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Submission not found'
        });
    }
    
    const deletedSubmission = formSubmissions.splice(submissionIndex, 1)[0];
    updateSubmissionStats();
    
    console.log('🗑️ Submission deleted:', { id: deletedSubmission.id });
    
    res.json({
        success: true,
        message: 'Submission deleted successfully',
        data: {
            id: deletedSubmission.id,
            name: `${deletedSubmission.firstName} ${deletedSubmission.lastName}`
        }
    });
});

// GET submission statistics
app.get('/api/stats', (req, res) => {
    const stats = calculateDetailedStats();
    
    res.json({
        success: true,
        data: stats
    });
});

// POST endpoint to bulk export submissions
app.post('/api/export', (req, res) => {
    const { format = 'json', dateFrom, dateTo } = req.body;
    
    let filteredSubmissions = [...formSubmissions];
    
    // Filter by date range if provided
    if (dateFrom || dateTo) {
        filteredSubmissions = filteredSubmissions.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            if (dateFrom && subDate < new Date(dateFrom)) return false;
            if (dateTo && subDate > new Date(dateTo)) return false;
            return true;
        });
    }
    
    // Remove sensitive data
    const safeSubmissions = filteredSubmissions.map(({ password, confirmPassword, ...sub }) => sub);
    
    if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(safeSubmissions);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="submissions-${Date.now()}.csv"`);
        res.send(csv);
    } else {
        // Return JSON
        res.json({
            success: true,
            message: `Exported ${safeSubmissions.length} submissions`,
            data: safeSubmissions,
            exportedAt: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        submissions: {
            total: formSubmissions.length,
            today: submissionStats.submissionsToday
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📝 Form available at http://localhost:${PORT}`);
    console.log(`🔍 Health check at http://localhost:${PORT}/health`);
    console.log(`📊 Admin dashboard at http://localhost:${PORT}/admin`);
    console.log(`📊 API endpoints:`);
    console.log(`   GET  /api/submissions - List all submissions`);
    console.log(`   GET  /api/submissions/:id - Get specific submission`);
    console.log(`   PUT  /api/submissions/:id - Update submission`);
    console.log(`   DELETE /api/submissions/:id - Delete submission`);
    console.log(`   GET  /api/stats - Get submission statistics`);
    console.log(`   POST /api/export - Export submissions`);
});
