const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'dm', 'player'], default: 'player' },
    createdAt: { type: Date, default: Date.now }
});

// Password hashing
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
// Add to your User model
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.sanitize = function(user) {
  const { password, __v, ...sanitizedUser } = user.toObject();
  return sanitizedUser;
};

module.exports = mongoose.model('User', userSchema);