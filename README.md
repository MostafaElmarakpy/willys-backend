# Willys Backend

## Project Overview
Willys Backend is a RESTful API designed to support the functionality of the Willys application. The backend handles data management, user authentication, and interactions with external services, providing a seamless user experience.

## Technical Stack
- **Languages**: JavaScript, TypeScript
- **Frameworks**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Mocha, Chai
- **Deployment**: Docker, AWS

## Installation Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/MostafaElmarakpy/willys-backend.git
   ```
2. Navigate into the project directory:
   ```bash
   cd willys-backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables (create a `.env` file following the `.env.example`):
   ```plaintext
   PORT=3000
   DB_URI=mongodb://localhost:27017/willys
   JWT_SECRET=your_jwt_secret
   ```
5. Start the application:
   ```bash
   npm start
   ```

## API Documentation
### Endpoints
- **GET /api/users**
  - Retrieves a list of users.
- **POST /api/users**
  - Creates a new user.
- **GET /api/users/:id**
  - Retrieves a user by ID.
- **PUT /api/users/:id**
  - Updates a user by ID.
- **DELETE /api/users/:id**
  - Deletes a user by ID.

### Sample Request
```json
{
  "username": "exampleUser",
  "password": "examplePass"
}
```

## Architecture Diagrams
![Architecture Diagram](link_to_architecture_diagram)

## Entity Relationships
- **User**: Represents a user in the application with a one-to-many relationship with Posts.
- **Post**: Represents a post created by a user.
  
```plaintext
User --< Post
```