import { Router } from 'express';
import path from 'path';
import { register } from '../controllers/userController.js';
import { login } from '../controllers/userController.js';
const router = Router();

export default (publicPath) => {
    // les pages html
    router.get('/login', (req, res) => {
        res.sendFile(path.join(publicPath, 'auth', 'login.html'));
    });

    router.get('/register', (req, res) => {
        res.sendFile(path.join(publicPath, 'auth', 'register.html'));
    });

    router.post('/register', register);
    router.post('/login', login);
    return router;
};