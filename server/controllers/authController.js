const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getValidationMessage = ({ name, rollNumber, email, password }) => {
    if (![name, rollNumber, email, password].every((value) => typeof value === 'string' && value.trim())) {
        return 'Name, roll number, email, and password are required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Please provide a valid email address.';
    }
    return null;
};

const createToken = (user) => jwt.sign(
    { userId: user._id, rollNumber: user.rollNumber },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);

exports.signup = async (req, res) => {
    try {
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const rollNumber = typeof body.rollNumber === 'string' ? body.rollNumber.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = body.password;

        const validationMessage = getValidationMessage({ name, rollNumber, email, password });
        if (validationMessage) return res.status(400).json({ message: validationMessage });
        if (!process.env.JWT_SECRET) {
            console.error('Signup failed: JWT_SECRET is not configured.');
            return res.status(500).json({ message: 'Authentication is not configured on the server.' });
        }

        const existingUser = await User.findOne({
            $or: [
                { rollNumber },
                { email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } }
            ]
        });
        if (existingUser) {
            const isDuplicateRollNumber = existingUser.rollNumber === rollNumber;
            return res.status(409).json({
                message: isDuplicateRollNumber
                    ? 'A student with this roll number already exists.'
                    : 'An account with this email address already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            rollNumber,
            email,
            password: hashedPassword
        });

        await newUser.save();

        const token = createToken(newUser);

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                rollNumber: newUser.rollNumber,
                email: newUser.email
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0];
            const fieldName = duplicateField === 'rollNumber' ? 'roll number' : 'email address';
            return res.status(409).json({ message: `A student with this ${fieldName} already exists.` });
        }
        console.error('Signup Error:', error.name, error.code || 'unknown');
        res.status(500).json({ message: 'Server error during signup.' });
    }
};

exports.login = async (req, res) => {
    try {
        const body = req.body || {};
        const identifier = typeof body.identifier === 'string'
            ? body.identifier.trim()
            : typeof body.rollNumber === 'string'
                ? body.rollNumber.trim()
                : typeof body.email === 'string'
                    ? body.email.trim()
                    : '';
        const { password } = body;

        if (!identifier || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Roll number or email and password are required.' });
        }
        if (!process.env.JWT_SECRET) {
            console.error('Login failed: JWT_SECRET is not configured.');
            return res.status(500).json({ message: 'Authentication is not configured on the server.' });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const lookup = isEmail
            ? { email: { $regex: `^${escapeRegex(identifier)}$`, $options: 'i' } }
            : { rollNumber: identifier };
        const user = await User.findOne(lookup).select('+password +passwordHash');

        if (!user) {
            return res.status(400).json({ message: 'Invalid Roll Number or Password.' });
        }

        const storedHash = user.password || user.passwordHash;
        const isMatch = storedHash ? await bcrypt.compare(password, storedHash) : false;
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Roll Number or Password.' });
        }

        const token = createToken(user);

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                rollNumber: user.rollNumber,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login Error:', error.name, error.code || 'unknown');
        res.status(500).json({ message: 'Server error during login.' });
    }
};