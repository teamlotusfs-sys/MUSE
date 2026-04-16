// pages/api/generate-playlist.js

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req, res) {
    const currentDateTime = new Date().toISOString(); // Gets the current date and time in ISO format
    const userLogin = req.user ? req.user.login : 'Unknown'; // Assumes user is on the request object

    res.status(200).json({ 
        message: 'Playlist generated', 
        currentDateTime, 
        userLogin
    });
}