// middleware/auth.js
const isAuthenticated = (req, res, next) => {
    if (req.session?.user) return next();
    // res.redirect('/login');
    return res.render('login', {
        error: 'Silakan login terlebih dahulu.',
        success: null,
        formData: req.body
    });
};

// Ekspor sebagai named export
export { isAuthenticated }; // ✅ Gunakan ES Modules