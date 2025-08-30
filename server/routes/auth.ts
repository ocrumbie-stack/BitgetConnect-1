import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { users } from '@shared/schema';
import { storage } from '../storage';

const router = Router();

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// Registration schema
const registerSchema = createInsertSchema(users).omit({ id: true });

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Find user by username
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: 'Login successful', 
      user: userWithoutPassword 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register endpoint (for creating demo user)
router.post('/register', async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
      tradingStyle: userData.tradingStyle || 'balanced'
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ 
      message: 'User created successfully', 
      user: userWithoutPassword 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password endpoint
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    // For now, we'll use a simple approach without session management
    // In production, you would get user ID from session/JWT
    const user = await storage.getUserByUsername('admin'); // Assuming admin user for demo
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await storage.updateUserPassword(user.id, hashedNewPassword);
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create demo user endpoint
router.post('/create-demo-user', async (req, res) => {
  try {
    // Check if demo user already exists
    const existingUser = await storage.getUserByUsername('admin');
    if (existingUser) {
      return res.json({ 
        message: 'Demo user already exists',
        userId: existingUser.id,
        username: existingUser.username 
      });
    }
    
    // Create demo user
    const hashedPassword = await bcrypt.hash('password', 10);
    const demoUser = await storage.createUser({
      username: 'admin',
      password: hashedPassword,
      tradingStyle: 'balanced',
      preferences: {
        confidenceThreshold: 70,
        maxLeverage: 5,
        riskTolerance: 'medium',
        timeframePreference: '15m'
      }
    });
    
    const { password: _, ...userWithoutPassword } = demoUser;
    res.json({ 
      message: 'Demo user created successfully', 
      user: userWithoutPassword 
    });
    
  } catch (error) {
    console.error('Demo user creation error:', error);
    res.status(500).json({ message: 'Failed to create demo user', error: error.message });
  }
});

// Debug endpoint to check user status
router.get('/debug-user', async (req, res) => {
  try {
    const user = await storage.getUserByUsername('admin');
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: 'User found',
        user: userWithoutPassword 
      });
    } else {
      res.json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ message: 'Debug failed', error: error.message });
  }
});

export default router;