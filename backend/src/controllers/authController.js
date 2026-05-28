const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key';

const createToken = (payload) => jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

const findExactUser = async (name, email, phone) => {
    return await User.findOne({ name, email, phone });
};

exports.checkUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'Name, email, and phone are required.' });
        }

        const duplicateUser = await findExactUser(name, email, phone);
        if (duplicateUser) {
            return res.status(409).json({ message: 'User with the same name, email, and phone already exists.' });
        }

        return res.status(200).json({ message: 'No duplicate user found.' });
    } catch (error) {
        return res.status(500).json({ message: 'User check failed.' });
    }
};

exports.signUp = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        if (!name || !phone || !email || !password) {
            return res.status(400).json({ message: 'All signup fields are required.' });
        }

        const duplicateUser = await findExactUser(name, email, phone);
        if (duplicateUser) {
            return res.status(409).json({ message: 'A user with the same name, email, and phone already exists.' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: 'Email is already registered.' });
        }

        const newUser = await User.create({ name, phone, email, password });
        const token = createToken({ id: newUser._id, email: newUser.email });

        return res.status(200).json({
            message: 'JWT created successfully.',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                currentBalance: newUser.currentBalance
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Signup failed.' });
    }
};

exports.signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = createToken({ id: user._id, email: user.email });
        return res.status(200).json({
            message: 'JWT created successfully.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                currentBalance: user.currentBalance
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Login failed.' });
    }
};
