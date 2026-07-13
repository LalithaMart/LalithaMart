import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { getIO } from '../config/socket.js';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { redisClient } from '../config/redis.js';

// Fallback in-memory store for OTPs if Redis is down
const memoryOtpStore = new Map();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const { name, phone, email, password, role } = req.body;

  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400);
    throw new Error('Please provide a valid 10-digit phone number');
  }

  const userExists = await User.findOne({ phone });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this phone number');
  }

  if (email) {
    if (!/^[\w-\.]+@gmail\.com$/.test(email.toLowerCase())) {
      res.status(400);
      throw new Error('Please provide a valid @gmail.com address');
    }
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      res.status(400);
      throw new Error('User already exists with this email address');
    }
  }

  const userRole = role && ['admin', 'customer', 'delivery'].includes(role) ? role : 'customer';
  const isApproved = userRole === 'delivery' ? false : true;

  // Generate an ID based on role
  let generatedId = '';
  const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
  if (userRole === 'customer') {
    generatedId = `CUST-${randomSuffix}`;
  } else if (userRole === 'delivery') {
    generatedId = `PART-${randomSuffix}`;
  }

  const user = await User.create({
    name,
    phone,
    email: email ? email.toLowerCase() : undefined,
    password,
    role: userRole,
    isApproved,
    customerId: userRole === 'customer' ? generatedId : undefined,
    partnerId: userRole === 'delivery' ? generatedId : undefined,
  });

  if (user) {
    if (userRole === 'delivery') {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        const partnerNotif = await Notification.create({
          message: `New delivery partner ${name} has signed up and is awaiting approval.`,
          type: 'System',
          relatedId: user._id,
          targetRole: 'admin'
        });
        getIO().to('admin-room').emit('new-notification', partnerNotif);
      } catch (e) {
        console.error('Failed to create notification', e);
      }
    }

    const token = generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      customerId: user.customerId,
      partnerId: user.partnerId,
      customDeliveryFee: user.customDeliveryFee,
      customFreeDeliveryCartValue: user.customFreeDeliveryCartValue,
      customDeliveryEarning: user.customDeliveryEarning,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { loginId, password } = req.body;
  const identifier = loginId || req.body.phone;

  if (!identifier) {
    res.status(400);
    throw new Error('Please provide a phone number or email');
  }

  const user = await User.findOne({ 
    $or: [
      { phone: identifier },
      { email: identifier.toLowerCase() }
    ]
  });

  if (user && (await user.matchPassword(password))) {
    if (!user.isApproved) {
      res.status(403);
      throw new Error('Your account is pending admin approval');
    }
    if (user.isBlocked) {
      res.status(403);
      throw new Error('Your account is deleted / blocked and you cant use the site. Contact for support.');
    }
    if (user.isSuspended) {
      res.status(403);
      throw new Error('Your account is deleted / blocked and you cant use the site. Contact for support.');
    }
    if (user.accountStatus === 'deleted_by_admin') {
      res.status(403);
      throw new Error('Your account is deleted / blocked and you cant use the site. Contact for support.');
    }
    if (user.accountStatus === 'deleted_by_user') {
      if (user.deletionScheduledFor && user.deletionScheduledFor > new Date()) {
        return res.status(403).json({
          requiresReactivation: true,
          deletionScheduledFor: user.deletionScheduledFor,
          message: 'Your account is scheduled for deletion. Do you want to reactivate it?'
        });
      } else {
        res.status(403);
        throw new Error('Your account has been permanently deleted.');
      }
    }
    
    const token = generateToken(res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      customerId: user.customerId,
      partnerId: user.partnerId,
      customDeliveryFee: user.customDeliveryFee,
      customFreeDeliveryCartValue: user.customFreeDeliveryCartValue,
      customDeliveryEarning: user.customDeliveryEarning,
      token,
    });
  } else {
    res.status(401);
    throw new Error('Invalid phone number or password');
  }
};

/**
 * @desc    Generate OTP for forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[\w-\.]+@gmail\.com$/.test(email.toLowerCase())) {
    res.status(400);
    throw new Error('Please provide a valid @gmail.com address');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.status(404);
    throw new Error('User not found with this email address');
  }

  // Simulate OTP Generation
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP in Redis with 10 minutes expiry, fallback to memory
  try {
    await redisClient.set(`OTP_${email.toLowerCase()}`, generatedOtp, 'EX', 600);
  } catch (err) {
    console.warn('Redis unavailable, using memory store for OTP');
    memoryOtpStore.set(`OTP_${email.toLowerCase()}`, generatedOtp);
    setTimeout(() => memoryOtpStore.delete(`OTP_${email.toLowerCase()}`), 600 * 1000);
  }

  // SIMULATION: Print to console
  console.log(`[EMAIL SIMULATION] OTP for ${email} is ${generatedOtp}`);

  // Nodemailer Integration
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Lalitha Mart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Lalitha Mart Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2e7d32; text-align: center;">Lalitha Mart</h2>
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px;">You requested a password reset. Please use the following 6-digit OTP to reset your password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; background-color: #f1f8e9; padding: 10px 20px; border-radius: 5px; color: #336600; letter-spacing: 5px;">${generatedOtp}</span>
          </div>
          <p style="font-size: 14px; color: #777;">This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP sent via Nodemailer to', email);
  } catch (err) {
    console.error('Failed to send email via Nodemailer:', err);
  }

  res.json({ message: `OTP sent to ${email} successfully!` });
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required');
  }

  let cachedOtp;
  try {
    cachedOtp = await redisClient.get(`OTP_${email.toLowerCase()}`);
  } catch (err) {
    cachedOtp = memoryOtpStore.get(`OTP_${email.toLowerCase()}`);
  }

  if (!cachedOtp || cachedOtp !== otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  res.json({ message: 'OTP verified successfully' });
};

/**
 * @desc    Verify OTP and Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !/^[\w-\.]+@gmail\.com$/.test(email.toLowerCase())) {
    res.status(400);
    throw new Error('Please provide a valid @gmail.com address');
  }

  let cachedOtp;
  try {
    cachedOtp = await redisClient.get(`OTP_${email.toLowerCase()}`);
  } catch (err) {
    cachedOtp = memoryOtpStore.get(`OTP_${email.toLowerCase()}`);
  }

  if (!cachedOtp || cachedOtp !== otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.password = newPassword;
  await user.save();

  try {
    await redisClient.del(`OTP_${email.toLowerCase()}`);
  } catch (err) {
    memoryOtpStore.delete(`OTP_${email.toLowerCase()}`);
  }

  res.json({ message: 'Password reset successfully' });
};

/**
 * @desc    Impersonate user
 * @route   POST /api/auth/impersonate/:id
 * @access  Private/Admin
 */
const impersonateUser = async (req, res) => {
  const userToImpersonate = await User.findById(req.params.id);

  if (userToImpersonate) {
    const token = generateToken(res, userToImpersonate._id);
    res.json({
      _id: userToImpersonate._id,
      name: userToImpersonate.name,
      phone: userToImpersonate.phone,
      role: userToImpersonate.role,
      isAvailable: userToImpersonate.isAvailable,
      customerId: userToImpersonate.customerId,
      partnerId: userToImpersonate.partnerId,
      customDeliveryFee: userToImpersonate.customDeliveryFee,
      customFreeDeliveryCartValue: userToImpersonate.customFreeDeliveryCartValue,
      customDeliveryEarning: userToImpersonate.customDeliveryEarning,
      token,
      isImpersonating: true
    });
  } else {
    res.status(404);
    throw new Error('Delivery partner not found');
  }
};

/**
 * @desc    Send OTP for Signup
 * @route   POST /api/auth/send-signup-otp
 * @access  Public
 */
const sendSignupOtp = async (req, res) => {
  const { name, phone, email, password, role } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required for signup');
  }
  
  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400);
    throw new Error('Please provide a valid 10-digit phone number');
  }

  const userExists = await User.findOne({ phone });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this phone number');
  }

  if (!/^[\w-\.]+@gmail\.com$/.test(email.toLowerCase())) {
    res.status(400);
    throw new Error('Please provide a valid @gmail.com address');
  }
  const emailExists = await User.findOne({ email: email.toLowerCase() });
  if (emailExists) {
    res.status(400);
    throw new Error('User already exists with this email address');
  }

  // Generate OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const payload = { name, phone, email: email.toLowerCase(), password, role, otp: generatedOtp };
  
  try {
    await redisClient.set(`SIGNUP_${email.toLowerCase()}`, JSON.stringify(payload), 'EX', 600); // 10 mins
  } catch (err) {
    console.warn('Redis unavailable, using memory store for OTP');
    memoryOtpStore.set(`SIGNUP_${email.toLowerCase()}`, payload);
    setTimeout(() => memoryOtpStore.delete(`SIGNUP_${email.toLowerCase()}`), 600 * 1000);
  }

  // Send Email
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Lalitha Mart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your Lalitha Mart Account Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2e7d32; text-align: center;">Welcome to Lalitha Mart!</h2>
          <p style="font-size: 16px;">Hello ${name},</p>
          <p style="font-size: 16px;">Thank you for registering. Please use the following 6-digit OTP to verify your email and complete your signup:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; background-color: #f1f8e9; padding: 10px 20px; border-radius: 5px; color: #336600; letter-spacing: 5px;">${generatedOtp}</span>
          </div>
          <p style="font-size: 14px; color: #777;">This OTP is valid for 10 minutes.</p>
        </div>
      `
    };

    res.json({ message: 'OTP sent successfully to your email' });
    
    transporter.sendMail(mailOptions).catch(err => {
      console.error('Failed to send signup email via Nodemailer:', err);
    });
    console.log('Signup OTP email initiated for', email);
  } catch (err) {
    console.error('Failed to initiate signup email:', err);
    res.status(500);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

/**
 * @desc    Verify OTP & Create Account
 * @route   POST /api/auth/verify-signup-otp
 * @access  Public
 */
const verifySignupOtp = async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required');
  }

  let payloadStr;
  try {
    payloadStr = await redisClient.get(`SIGNUP_${email.toLowerCase()}`);
  } catch (err) {
    const memData = memoryOtpStore.get(`SIGNUP_${email.toLowerCase()}`);
    payloadStr = memData ? JSON.stringify(memData) : null;
  }

  if (!payloadStr) {
    res.status(400);
    throw new Error('OTP expired or not found. Please register again.');
  }

  const payload = JSON.parse(payloadStr);

  if (payload.otp !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  // OTP is correct, let's create the user!
  const userRole = payload.role && ['admin', 'customer', 'delivery'].includes(payload.role) ? payload.role : 'customer';
  const isApproved = userRole === 'delivery' ? false : true;

  // Generate an ID based on role
  let generatedId = '';
  const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
  if (userRole === 'customer') {
    generatedId = `CUST-${randomSuffix}`;
  } else if (userRole === 'delivery') {
    generatedId = `PART-${randomSuffix}`;
  }

  const user = await User.create({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    password: payload.password,
    role: userRole,
    isApproved,
    customerId: userRole === 'customer' ? generatedId : undefined,
    partnerId: userRole === 'delivery' ? generatedId : undefined,
  });

  if (user) {
    // Clean up OTP
    try {
      await redisClient.del(`SIGNUP_${email.toLowerCase()}`);
    } catch (err) {
      memoryOtpStore.delete(`SIGNUP_${email.toLowerCase()}`);
    }

    if (userRole === 'delivery') {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        const partnerNotif = await Notification.create({
          message: `New delivery partner ${user.name} has signed up and is awaiting approval.`,
          type: 'System',
          relatedId: user._id,
          targetRole: 'admin'
        });
        getIO().to('admin-room').emit('new-notification', partnerNotif);
      } catch (e) {
        console.error('Failed to create notification', e);
      }
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      customerId: user.customerId,
      partnerId: user.partnerId,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

/**
 * @desc    Reactivate user account
 * @route   POST /api/auth/reactivate
 * @access  Public
 */
const reactivateAccount = async (req, res) => {
  const { loginId, password } = req.body;
  const identifier = loginId || req.body.phone;

  if (!identifier) {
    res.status(400);
    throw new Error('Please provide a phone number or email');
  }

  const user = await User.findOne({ 
    $or: [
      { phone: identifier },
      { email: identifier.toLowerCase() }
    ]
  });

  if (user && (await user.matchPassword(password))) {
    if (user.accountStatus === 'deleted_by_user') {
      user.accountStatus = 'active';
      user.deletionScheduledFor = undefined;
      await user.save();
      
      const Notification = (await import('../models/Notification.js')).default;
      const notif = await Notification.create({
        title: 'Account Restored',
        message: 'Your account has been successfully restored and is now active.',
        type: 'System',
        userId: user._id,
        targetRole: 'specific',
        link: '/'
      });
      
      import('../config/socket.js').then(({ getIO }) => {
        getIO().to(user._id.toString()).emit('new-notification', notif);
      }).catch(err => console.error('Socket emit error:', err));
      
      const token = generateToken(res, user._id);
      res.json({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        customerId: user.customerId,
        partnerId: user.partnerId,
        customDeliveryFee: user.customDeliveryFee,
        customFreeDeliveryCartValue: user.customFreeDeliveryCartValue,
        customDeliveryEarning: user.customDeliveryEarning,
        token,
        message: 'Account successfully reactivated!'
      });
    } else {
      res.status(400);
      throw new Error('Account does not require reactivation.');
    }
  } else {
    res.status(401);
    throw new Error('Invalid phone number or password');
  }
};

export {
  registerUser,
  sendSignupOtp,
  verifySignupOtp,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  impersonateUser,
  reactivateAccount,
};
