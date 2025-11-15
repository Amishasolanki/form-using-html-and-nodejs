# Express Form Server

A simple Node.js server using Express to serve HTML forms and handle form submissions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Features

- **Static file serving** - Serves HTML, CSS, and JavaScript files
- **Form handling** - Processes POST requests from the HTML form
- **JSON responses** - Returns structured JSON data for API interactions
- **Error handling** - Comprehensive error handling middleware
- **Health check** - `/health` endpoint for monitoring
- **CORS ready** - Can be easily extended for API usage

## Endpoints

- `GET /` - Serves the main HTML form
- `POST /submit-form` - Handles form submissions
- `GET /api/submissions` - Demo endpoint for submissions data
- `GET /health` - Health check endpoint

## Usage

Once the server is running, open your browser and navigate to:
```
http://localhost:3000
```

Fill out the form and submit it. The server will log the form data and return a JSON response.

## Form Data Structure

The server processes form data into a structured format:

```json
{
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "birthdate": "1990-01-01"
  },
  "accountInfo": {
    "username": "johndoe",
    "password": "password123"
  },
  "preferences": {
    "country": "us",
    "gender": "male",
    "interests": ["sports", "technology"]
  },
  "additionalInfo": {
    "website": "https://johndoe.com",
    "age": "30",
    "appointmentTime": "14:30",
    "favoriteColor": "#4facfe",
    "experience": "7",
    "bio": "Software developer with 5+ years experience"
  },
  "submittedAt": "2023-12-01T10:30:00.000Z"
}
```

## Development

The server includes:
- Express.js for web framework
- Body parsing middleware for JSON and URL-encoded data
- Static file serving for frontend assets
- Comprehensive error handling
- Development-friendly logging

## Next Steps

To extend this server:
- Add database integration (MongoDB, PostgreSQL, etc.)
- Implement user authentication
- Add input validation middleware
- Create RESTful API endpoints
- Add file upload capabilities
