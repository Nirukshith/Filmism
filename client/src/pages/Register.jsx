import { useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

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
  background: #efefef;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 3rem;
  position: relative;
  min-height: 100vh;

  @media (max-width: 1024px) {
    padding: 3rem 2.5rem;
  }

  @media (max-width: 768px) {
    min-height: 100vh;
    padding: 6rem 2rem 3rem;
    align-items: center;
  }
`

const RightPanel = styled.div`
  background: #ff751f;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 3rem;
  position: relative;

  @media (max-width: 768px) {
    display: none;
  }
`

// ─── Left: Form side ─────────────────────────────────────────────────────────

const FormHeader = styled.div`
  width: 100%;
  max-width: 400px;
  margin-bottom: 2.5rem;
`

const BackLink = styled(Link)`
  position: absolute;
  top: 2rem;
  left: 2rem;
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.85rem;
  color: #111;
  text-decoration: none;
  text-transform: lowercase;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.2s;
  z-index: 2;


  &:hover {
    opacity: 0.6;
  }
`

const FormTitle = styled.h1`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
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
  font-weight: 400;
`

// ─── Form elements ────────────────────────────────────────────────────────────

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  max-width: 400px;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top:-2.4rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
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

const ErrorText = styled.span`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.75rem;
  color: #c0392b;
`

const SubmitBtn = styled.button`
  margin-top: 0.6rem;
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
  margin: 0.4rem 0;

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

const LoginPrompt = styled.p`
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

// ─── Right panel decoration ───────────────────────────────────────────────────

const RightContent = styled.div`
  text-align: center;
  width: 100%;
  max-width: 400px;
  margin-top: 0;
`

const RightTitle = styled.h2`
  font-family: 'Lemon Milk', 'Playfair Display', Georgia, serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: #111;
  line-height: 1.1;
  margin: 0 0 1rem;
`

const RightBody = styled.p`
  font-family: 'Lexend Deca', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1rem;
  color: #111;
  line-height: 1.7;
  margin: 0;
  opacity: 0.75;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 2rem 0 0;
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
    margin-top: 0.05rem;
  }
`

// ─── Component ───────────────────────────────────────────────────────────────

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // clear error on edit
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.firstName.trim()) newErrors.firstName = 'required'
    if (!form.lastName.trim())  newErrors.lastName  = 'required'
    if (!form.email.trim())     newErrors.email     = 'required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'invalid email'
    if (!form.password)         newErrors.password  = 'required'
    else if (form.password.length < 6) newErrors.password = 'min 6 characters'
    if (form.confirmPassword !== form.password) newErrors.confirmPassword = 'passwords do not match'
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
      // Call real API endpoint
      const response = await authAPI.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      })
      
      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data))
      }
      
      navigate('/taste') // go to taste profile flow after register
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.'
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>

      {/* ── Left: Decorative ── */}
      <RightPanel>
        <BackLink to="/">← back</BackLink>
        <RightContent>
          <RightTitle>Films that<br />feel like you.</RightTitle>
          <RightBody>
            Not an algorithm. A taste profile built from the posters that pull you in.
          </RightBody>
          <FeatureList>
            <FeatureItem>Browse posters from world cinema</FeatureItem>
            <FeatureItem>Build your aesthetic taste profile</FeatureItem>
            <FeatureItem>Get matched to films you'll love</FeatureItem>
            <FeatureItem>Rate, save, and track what you watch</FeatureItem>
          </FeatureList>
        </RightContent>
      </RightPanel>

      {/* ── Right: Form ── */}
      <LeftPanel>
        <FormHeader>
          <FormTitle>Create your<br />account.</FormTitle>
        </FormHeader>

        <Form onSubmit={handleSubmit} noValidate>

          <FieldRow>
            <Field>
              <Label htmlFor="firstName">first name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Ryan"
                value={form.firstName}
                onChange={handleChange}
              />
              {errors.firstName && <ErrorText>{errors.firstName}</ErrorText>}
            </Field>

            <Field>
              <Label htmlFor="lastName">last name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Gosling"
                value={form.lastName}
                onChange={handleChange}
              />
              {errors.lastName && <ErrorText>{errors.lastName}</ErrorText>}
            </Field>
          </FieldRow>

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

          <Field>
            <Label htmlFor="password">password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="min. 6 characters"
              value={form.password}
              onChange={handleChange}
            />
            {errors.password && <ErrorText>{errors.password}</ErrorText>}
          </Field>

          <Field>
            <Label htmlFor="confirmPassword">confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <ErrorText>{errors.confirmPassword}</ErrorText>}
          </Field>

          {errors.general && <ErrorText>{errors.general}</ErrorText>}

          <SubmitBtn type="submit" disabled={loading}>
            {loading ? 'creating account...' : 'create account →'}
          </SubmitBtn>

          <Divider><span>or</span></Divider>

          <LoginPrompt>
            already have an account? <Link to="/login">log in</Link>
          </LoginPrompt>

        </Form>
      </LeftPanel>

    </PageWrapper>
  )
}

export default RegisterPage