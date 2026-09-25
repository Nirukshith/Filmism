import { useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import loginPoster from '../assets/loginposter.webp'
import { authAPI } from '../services/api'
import { useTasteProfile } from '../hooks/useTasteProfile'


// ─── Layout ──────────────────────────────────────────────────────────────────

const PageWrapper = styled.main`
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const LeftPanel = styled.div`
  background: #ff751f;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 3rem;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    display: none;
  }
`

const RightPanel = styled.div`
  background: #efefef;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 5rem 4rem 4rem;
  position: relative;
  min-height: 100vh;

  @media (max-width: 1024px) {
    padding: 3rem 2.5rem;
  }

  @media (max-width: 768px) {
    min-height: 100vh;
    padding: 5.5rem 1.5rem 2.5rem;
    align-items: center;
  }

  @media (max-width: 480px) {
    padding: 4.5rem 1.25rem 2rem;
  }
`

// ─── Nav ─────────────────────────────────────────────────────────────────────

const Nav = styled.nav`
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2.5rem;
  z-index: 20;
  width: max-content;
  max-width: 95vw;

  @media (max-width: 640px) {
    top: 1.25rem;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
`

const NavLink = styled(Link)`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #111;
  text-decoration: none;
  text-transform: lowercase;
  transition: opacity 0.2s;
  padding: 4px;

  @media (max-width: 640px) {
    font-size: 0.85rem;
  }

  &:hover {
    opacity: 0.7;
  }
`

// ─── Left decorative panel ────────────────────────────────────────────────────

const LeftContent = styled.div`
  text-align: center;
  max-width: 340px;
`

const LeftPoster = styled.img`
  width: min(80%, 300px);
  height: auto;
  object-fit: cover;
  transform: scale(4.2);
  margin-left:34rem;
  margin-top: -1.5rem;
`

const LeftLogo = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  color: #111;
  line-height: 1;
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
`

const LeftTagline = styled.p`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1rem;
  color: #111;
  opacity: 0.75;
  line-height: 1.7;
  margin: 0 0 2.5rem;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: left;
`

const FeatureItem = styled.li`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.9rem;
  color: #111;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  &::before {
    content: '—';
    font-weight: 700;
    flex-shrink: 0;
  }
`

// ─── Right: Form ─────────────────────────────────────────────────────────────

const FormHeader = styled.div`
  width: 100%;
  max-width: 400px;
  margin-bottom: 2rem;

  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
`

const BackLink = styled(Link)`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.85rem;
  color: #555;
  text-decoration: none;
  text-transform: lowercase;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.6;
  }
`

const FormTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(1.8rem, 6vw, 3.5rem);
  font-weight: 700;
  color: #111;
  line-height: 1.05;
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
`

const FormSubtitle = styled.p`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #555;
  margin: 0;
`

// ─── Form elements ────────────────────────────────────────────────────────────

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  width: 100%;
  max-width: 400px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const Label = styled.label`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: #111;
  text-transform: lowercase;
  letter-spacing: 0.05em;
`

const Input = styled.input`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #111;
  background: transparent;
  border: none;
  border-bottom: 2px solid #111;
  padding: 0.55rem 0;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;

  &::placeholder {
    color: #aaa;
    font-weight: 300;
  }

  &:focus {
    border-bottom-color: #ff751f;
  }
`

const PasswordRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const PasswordInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const PasswordInput = styled(Input)`
  padding-right: 2.5rem;
`

const ShowPasswordBtn = styled.button`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0.35rem 0.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #111;
  }
`

const EyeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const ForgotLink = styled(Link)`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.78rem;
  color: #555;
  text-decoration: none;
  text-transform: lowercase;
  align-self: flex-end;
  margin-top: 0.2rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.6;
  }
`

const ErrorText = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.75rem;
  color: #c0392b;
`

const SubmitBtn = styled.button`
  margin-top: 0.4rem;
  padding: 0.85rem 1.4rem;
  border: 2px solid #111;
  background: #111;
  color: #fff;
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  width: 100%;

  &:hover {
    background: transparent;
    color: #111;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ccc;
  }

  span {
    font-family: 'Lexend Deca', sans-serif;
    font-size: 0.78rem;
    color: #aaa;
    text-transform: lowercase;
  }
`

const RegisterPrompt = styled.p`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.88rem;
  color: #555;
  margin: 0;
  text-align: center;

  a {
    color: #111;
    font-weight: 700;
    text-decoration: none;
    border-bottom: 1px solid #111;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.6;
    }
  }
`

// ─── Component ───────────────────────────────────────────────────────────────

function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.email.trim()) newErrors.email = 'required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'invalid email'
    if (!form.password) newErrors.password = 'required'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.login({ email: form.email, password: form.password })

      if (response.data.token) {
        try {
          sessionStorage.removeItem('filmism_dashboard_recs')
          sessionStorage.removeItem('filmism_watched_outcomes')
          sessionStorage.removeItem('filmism_profile_ratings')
        } catch (e) {}
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data))
        localStorage.setItem('filmism_rotate_cache', 'true')  // rotate cached recommendations on login
        localStorage.removeItem('filmism_needs_refresh')
        localStorage.setItem('filmism_is_returning_user', 'true')
        window.dispatchEvent(new Event('filmism_auth_update'))
      }

      const user = response.data
      const isComplete = !!(user.tasteProfileComplete)

      if (user?.role === 'admin') {
        navigate(returnTo || '/admin')
      } else if (returnTo) {
        navigate(returnTo)
      } else if (isComplete) {
        navigate('/recommend')
      } else {
        navigate('/taste')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password. Please try again.'
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }


  return (
    <PageWrapper>

      {/* ── Left: Decorative ── */}
      <LeftPanel>
        <LeftPoster src={loginPoster} alt="Film poster" />
      </LeftPanel>

      {/* ── Right: Form ── */}
      <RightPanel>
        <BackLink to="/">← back</BackLink>

        <FormHeader>
          <FormTitle>Welcome<br />back.</FormTitle>
          <FormSubtitle>Log in to continue discovering films.</FormSubtitle>
        </FormHeader>

        <Form onSubmit={handleSubmit} noValidate>

          <Field>
            <Label htmlFor="email">email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
            {errors.email && <ErrorText>{errors.email}</ErrorText>}
          </Field>

          <PasswordRow>
            <Label htmlFor="password">password</Label>
            <PasswordInputWrap>
              <PasswordInput
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="your password"
                value={form.password}
                onChange={handleChange}
              />
              <ShowPasswordBtn
                type="button"
                onClick={() => setShowPass((prev) => !prev)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </ShowPasswordBtn>
            </PasswordInputWrap>
            {errors.password && <ErrorText>{errors.password}</ErrorText>}
            <ForgotLink to="/forgot-password">forgot password?</ForgotLink>
          </PasswordRow>

          {errors.general && <ErrorText>{errors.general}</ErrorText>}

          <SubmitBtn type="submit" disabled={loading}>
            {loading ? 'logging in...' : 'log in →'}
          </SubmitBtn>

          <Divider><span>or</span></Divider>

          <RegisterPrompt>
            don't have an account? <Link to={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}>create one</Link>
          </RegisterPrompt>

        </Form>
      </RightPanel>

    </PageWrapper>
  )
}

export default LoginPage