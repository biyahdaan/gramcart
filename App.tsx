
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Stepper, Step, StepLabel, Button, TextField, Modal, Box, Typography, Rating } from '@mui/material';

const API_URL = 'http://localhost:5000/api';

const App = () => {
    const [bookings, setBookings] = useState([]);
    const [user, setUser] = useState({ id: '60d5f9f8a9d3a0a8e4f8d3b1', role: 'customer' }); // Example user
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [otp, setOtp] = useState('');
    const [review, setReview] = useState('');
    const [rating, setRating] = useState(0);
    const [openOtpModal, setOpenOtpModal] = useState(false);
    const [openReviewModal, setOpenReviewModal] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [user]);

    const fetchBookings = async () => {
        try {
            const res = await axios.get(`${API_URL}/my-bookings/${user.role}/${user.id}`);
            setBookings(res.data);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        }
    };

    const handleOpenOtpModal = (booking) => {
        setSelectedBooking(booking);
        setOpenOtpModal(true);
    };

    const handleCloseOtpModal = () => {
        setOpenOtpModal(false);
        setSelectedBooking(null);
        setOtp('');
    };

    const handleOpenReviewModal = (booking) => {
        setSelectedBooking(booking);
        setOpenReviewModal(true);
    };

    const handleCloseReviewModal = () => {
        setOpenReviewModal(false);
        setSelectedBooking(null);
        setReview('');
        setRating(0);
    };

    const handleFinishOrder = async () => {
        if (!selectedBooking) return;
        try {
            await axios.patch(`${API_URL}/bookings/${selectedBooking._id}/finish`, { otp });
            alert('Order completed successfully!');
            handleCloseOtpModal();
            fetchBookings(); // Refresh bookings to show updated status
        } catch (err) {
            console.error('Error finishing order:', err);
            alert('Failed to complete order. Please check the OTP and try again.');
        }
    };
    
    const handleReview = async () => {
        if (!selectedBooking) return;
        try {
            await axios.patch(`${API_URL}/bookings/${selectedBooking._id}/status`, { 
                status: 'reviewed',
                review: { text: review, rating }
            });
            alert('Review submitted successfully!');
            handleCloseReviewModal();
            fetchBookings(); // Refresh bookings
        } catch (err) {
            console.error('Error submitting review:', err);
            alert('Failed to submit review.');
        }
    };


    const getStep = (status) => {
        const steps = ['pending', 'approved', 'advance_paid', 'finished', 'reviewed'];
        const stepIndex = steps.indexOf(status);
        // If status is 'completed' (old status) or 'finished', treat it as the 'finished' step
        if (status === 'completed' || status === 'finished') return 3;
        if (stepIndex !== -1) return stepIndex;
        // Handle other statuses like 'rejected' if needed
        return 0; 
    };
    
    const steps = ['Pending', 'Approved', 'Advance Paid', 'Finished', 'Reviewed'];

    return (
        <div style={{ padding: '20px' }}>
            <h1>My Bookings</h1>
            <div style={{ marginBottom: '20px' }}>
                <Button onClick={() => setUser({ id: '60d5f9f8a9d3a0a8e4f8d3b1', role: 'customer' })}>View as Customer</Button>
                <Button onClick={() => setUser({ id: '60d5f9f8a9d3a0a8e4f8d3b2', role: 'vendor' })}>View as Vendor</Button>
            </div>
            {bookings.map((booking) => (
                <div key={booking._id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                    <h3>Booking for {booking.serviceName}</h3>
                    <p>Status: {booking.status}</p>
                    <Stepper activeStep={getStep(booking.status)} alternativeLabel>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    {user.role === 'vendor' && booking.status === 'advance_paid' && (
                        <Button onClick={() => handleOpenOtpModal(booking)}>Complete Order</Button>
                    )}
                    {user.role === 'customer' && booking.status === 'finished' && (
                        <Button onClick={() => handleOpenReviewModal(booking)}>Rate & Review</Button>
                    )}
                </div>
            ))}

            {/* OTP Modal */}
            <Modal open={openOtpModal} onClose={handleCloseOtpModal}>
                <Box sx={{ ...modalStyle, width: 400 }}>
                    <Typography variant="h6">Complete Order</Typography>
                    <p>Enter the OTP provided by the customer to finish the order.</p>
                    <TextField
                        label="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Button onClick={handleFinishOrder} variant="contained">Verify & Complete</Button>
                </Box>
            </Modal>

            {/* Review Modal */}
            <Modal open={openReviewModal} onClose={handleCloseReviewModal}>
                <Box sx={{ ...modalStyle, width: 400 }}>
                    <Typography variant="h6">Rate and Review</Typography>
                    <Rating
                        name="simple-controlled"
                        value={rating}
                        onChange={(event, newValue) => {
                            setRating(newValue);
                        }}
                    />
                    <TextField
                        label="Write your review"
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                    <Button onClick={handleReview} variant="contained">Submit Review</Button>
                </Box>
            </Modal>
        </div>
    );
};

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

export default App;

