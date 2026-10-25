const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authorization = req.header('Authorization') || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Access denied. A Bearer token is required.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (!verified.userId) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
