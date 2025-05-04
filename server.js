import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import bodyParser from 'body-parser';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';


const app = express();
const port = 3000;
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }))

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Setup session
app.use(session({
	secret: 'rahasia', // apa aj bisa sih keknya
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false } // set true jika menggunakan HTTPS
}));


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
});



// Routes
app.get('/register', async (req, res) => {
	try {
	  // Ambil data dosen dari database
	  const [dosens] = await pool.query(
		'SELECT * FROM users WHERE role = ?',
		['dosen']
	  );

	  req.session.dosens = dosens
	  
	  res.render('register', {
		error: null,
		success: null,
		formData: null,
		dosens: req.session.dosens
	  });
	} catch (err) {
	  console.error('Error:', err);
	  res.render('register', {
		error: 'Gagal memuat data dosen',
		success: null,
		formData: null,
		dosens: []
	  });
	}
  });


app.get('/login', (req, res) => {
	// kalo ada data langsung ke dashboard
	if (req.session.user) {
		if (req.session.user.role === 'mahasiswa') {
			return res.redirect('/mahasiswa/bimbingan');
		} else if (req.session.user.role === 'dosen') {
			return res.redirect('/dosen/bimbingan');
		} else {
			return res.redirect('/register'); // ini aneh, tapi nanti aj benerinnya :v
		}
	}

	res.render('login', {
		error: req.query.error || null,
		success: req.query.success || null,
		formData: null
	});
});



app.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error('Gagal logout:', err);
			return res.status(500).json({ error: 'Gagal logout' });
		}
		res.clearCookie('connect.sid');
		res.sendStatus(200); // Beri tahu frontend bahwa logout sukses
	});
});



// POST register
app.post('/register', async (req, res) => {
	const { username, password, role, dosen_id } = req.body;

	try {
		const hashedPassword = await bcrypt.hash(password, 8);
		const [results] = await pool.query(
			'INSERT INTO users (username, password, role, supervisor_id) VALUES (?, ?, ?, ?)',
			[username, hashedPassword, role || 'mahasiswa', dosen_id || null]
		);

		// Ambil lagi data dosen dari database
		const [dosens] = await pool.query(
		'SELECT * FROM users WHERE role = ?',
		['dosen']
		);
		req.session.dosens = dosens

		res.redirect('/login');

	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') {
			return res.render('register', {
				error: 'Username sudah dipakai',
				success: null,
				formData: req.body,
				dosens: req.session.dosens
			});
		}
		console.error('Registration error:', error);
		res.render('register', {
			error: 'Registrasi gagal',
			success: null,
			formData: req.body,
			dosens: req.session.dosens
		});
	}
});


// POST login
app.post('/login', async (req, res) => {
	const { username, password } = req.body;

	try {
		const [results] = await pool.query(
			'SELECT * FROM users WHERE username = ?',
			[username]
		);

		if (results.length === 0) {
			return res.render('login', {
				error: 'Username tidak ditemukan',
				success: null,
				formData: req.body
			});
		}

		const user = results[0];
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			return res.render('login', {
				error: 'Password salah',
				success: null,
				formData: req.body
			});
		}

		req.session.user = {
			id: user.id,
			username: user.username,
			role: user.role,
		};

		// Redirect based on role
		if (user.role === 'mahasiswa') {
			return res.redirect('/mahasiswa/bimbingan');
		} else if (user.role === 'dosen') {
			return res.redirect('/dosen/bimbingan');
		} else {
			return res.redirect('/register');
		}


	} catch (error) {
		console.error('Login error:', error);
		res.render('login', {
			error: 'Login failed',
			success: null,
			formData: req.body
		});
	}
});



// Need auth
import { isAuthenticated } from './middleware/auth.js';


// GET /dosen/bimbingan - Menampilkan semua jadwal bimbingan
app.get('/dosen/bimbingan', isAuthenticated, async (req, res) => {
	try {
		const dosenId = req.session.user.id;

		// Query untuk mendapatkan semua jadwal bimbingan
		const [jadwals] = await pool.query(
			`SELECT j.*, u.username AS mahasiswa 
		 FROM jadwal j
		 JOIN users u ON u.id = j.user_id
		 WHERE u.supervisor_id = ?
		 ORDER BY j.tanggal DESC, j.waktu_mulai DESC`,
			[dosenId]
		);

		// Pisahkan antara yang nunggu, approved, dan batal
		const pendingJadwals = jadwals.filter(j => j.status === 'Sedang Verifikasi');
		const approvedJadwals = jadwals.filter(j => j.status === 'Telah Verifikasi');
		const batalJadwals = jadwals.filter(j => j.status === 'Batal');

		res.render('dosen/bimbingan', {
			user: req.session.user,
			pendingJadwals: pendingJadwals,
			approvedJadwals: approvedJadwals,
			batalJadwals: batalJadwals,
			success: req.query.success,
			error: null
		});

	} catch (err) {
		console.error('Database error:', err);
		res.status(500).render('dosen/bimbingan', {
			user: req.session.user,
			pendingJadwals: [],
			approvedJadwals: [],
			error: 'Gagal memuat jadwal bimbingan',
			success: null
		});
	}
});


app.get('/mahasiswa/bimbingan', isAuthenticated, async (req, res) => {
	try {
		const [jadwals] = await pool.query(
			`SELECT * FROM jadwal 
		 WHERE user_id = ?
		 ORDER BY tanggal DESC, waktu_mulai DESC`,
			[req.session.user.id]
		);

		// Pisahkan antara yang nunggu, approved, dan batal
		const pendingJadwals = jadwals.filter(j => j.status === 'Sedang Verifikasi');
		const approvedJadwals = jadwals.filter(j => j.status === 'Telah Verifikasi');
		const batalJadwals = jadwals.filter(j => j.status === 'Batal');

		res.render('mahasiswa/bimbingan', {
			user: req.session.user,
			pendingJadwals: pendingJadwals,
			approvedJadwals: approvedJadwals,
			batalJadwals: batalJadwals,
			success: req.query.success,
			error: null
		});

	} catch (err) {
		console.error('Database error:', err);
		res.status(500).render('mahasiswa/bimbingan', {
			user: req.session.user,
			jadwals: [],
			error: 'Gagal memuat data jadwal',
			success: null
		});
	}
});



// form submission (POST) dengan async/await
app.post('/jadwal', async (req, res) => {
	try {
		const { tanggal, waktu_mulai, waktu_selesai } = req.body;
		const userId = req.session.user.id;

		// Validasi role dari session
		if (req.session.user.role !== 'mahasiswa') {
			return res.status(403).render('mahasiswa/bimbingan', {
				user: req.session.user,
				error: 'Hanya mahasiswa yang bisa membuat jadwal',
				success: null
			});
		}

		// Validasi data
		if (!tanggal || !waktu_mulai || !waktu_selesai) {
			return res.status(400).render('mahasiswa/bimbingan', {
				user: req.session.user,
				error: 'Data tidak lengkap',
				success: null,
				formData: req.body
			});
		}

		// Simpan ke database
		const [results] = await pool.query(
			`INSERT INTO jadwal (user_id, tanggal, waktu_mulai, waktu_selesai)
		 VALUES (?, ?, ?, ?)`,
			[userId, tanggal, waktu_mulai, waktu_selesai]
		);

		return res.redirect('mahasiswa/bimbingan?success=Jadwal berhasil ditambahkan');

	} catch (error) {
		console.error('Error:', error);
		return res.status(500).render('mahasiswa/bimbingan', {
			user: req.session.user,
			error: 'Gagal menyimpan jadwal: ' + error.message,
			success: null,
			formData: req.body
		});
	}
});


app.post('/verifikasi', async (req, res) => {
	const { jadwal_id, action } = req.body;

	try {
		// Tentukan status baru berdasarkan action
		const newStatus = action === 'terima' ? 'Telah Verifikasi' : 'Batal';

		// Eksekusi query dengan async/await
		const result = await pool.query(
			`UPDATE jadwal 
		 SET status = ? 
		 WHERE id = ? AND status = 'Sedang Verifikasi'`,
			[newStatus, jadwal_id]
		);

		return res.redirect('dosen/bimbingan?success=Jadwal berhasil diverifikasi');

	} catch (err) {
		console.error('Database error:', err);
		res.status(500).json({
			status: 'error',
			message: 'Terjadi kesalahan server'
		});
	}
});



app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});