const { z } = require('zod');

// Strong password regex: at least 8 chars, 1 uppercase, 1 special character
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,100}$/;

const registerSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name cannot be empty')
    .max(50, 'First name must be under 50 characters'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name must be under 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(100, 'Email must be under 100 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be under 100 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter and one special character.'
    ),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

const resendOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

const updateTastePreferencesSchema = z.object({
  selectedCinemas: z.array(z.string()).max(30).optional(),
  selectedGenres: z.array(z.union([z.string(), z.number()])).max(40).optional(),
  selectedPosters: z.array(z.union([z.string(), z.number()])).max(60).optional(),
  aestheticProfile: z.any().optional(),
  tasteProfileComplete: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .regex(
      PASSWORD_REGEX,
      'New password must contain at least one uppercase letter and one special character.'
    )
    .optional(),
  profilePicture: z
    .string()
    .max(2 * 1024 * 1024, 'Profile picture is too large (max 1.5MB)')
    .nullable()
    .optional(),
});

const verifyEmailChangeSchema = z.object({
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  updateTastePreferencesSchema,
  updateProfileSchema,
  verifyEmailChangeSchema,
};
