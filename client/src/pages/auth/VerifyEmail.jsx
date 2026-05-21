import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiMail } from 'react-icons/fi';
import { useAuth } from '../../context/useAuth';
import { getApiError } from '../../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [devVerificationUrl, setDevVerificationUrl] = useState('');
  const verificationRequestRef = useRef({ token: '', promise: null });
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [verification, setVerification] = useState(() => (
    token
      ? { status: 'loading', message: 'Verifying your email...' }
      : { status: 'error', message: 'Verification link is missing a token.' }
  ));

  useEffect(() => {
    if (!token) return undefined;

    if (verificationRequestRef.current.token !== token) {
      verificationRequestRef.current = {
        token,
        promise: verifyEmail(token, email),
      };
    }

    let active = true;
    verificationRequestRef.current.promise
      .then((data) => {
        if (active) {
          setVerification({
            status: 'success',
            message: data.message || 'Email verified successfully. You can now sign in.',
          });
        }
      })
      .catch((err) => {
        if (active) {
          setVerification({
            status: 'error',
            message: getApiError(err, 'Verification failed. Please request a new link.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [email, token, verifyEmail]);

  const resend = async () => {
    if (!email) return;
    setResendLoading(true);
    setDevVerificationUrl('');
    try {
      const data = await resendVerification(email);
      setVerification((current) => ({
        ...current,
        message: data.message || 'Verification email sent. Please check your inbox.',
      }));
      if (data.emailDelivery?.devVerificationUrl) setDevVerificationUrl(data.emailDelivery.devVerificationUrl);
    } catch (err) {
      setVerification((current) => ({
        ...current,
        message: getApiError(err, 'Could not resend verification email.'),
      }));
    } finally {
      setResendLoading(false);
    }
  };

  const { status, message } = verification;
  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl ${isSuccess ? 'bg-green-50 text-green-600' : status === 'loading' ? 'bg-blue-50 text-[#003087]' : 'bg-red-50 text-red-600'}`}>
          {isSuccess ? <FiCheckCircle size={26} /> : status === 'loading' ? <FiMail size={26} /> : <FiAlertCircle size={26} />}
        </div>

        <h1 className="text-center text-2xl font-bold text-gray-900">
          {isSuccess ? 'Email verified' : status === 'loading' ? 'Checking link' : 'Verification problem'}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-gray-500">{message}</p>

        {devVerificationUrl && (
          <a href={devVerificationUrl} className="mt-4 block text-center text-sm font-semibold text-[#003087] hover:underline">
            Open new development verification link
          </a>
        )}

        <div className="mt-6 grid gap-3">
          {isSuccess ? (
            <Link to="/app/login?verified=1" className="rounded-xl bg-[#003087] py-3 text-center text-sm font-semibold text-white hover:bg-blue-800">
              Sign In
            </Link>
          ) : (
            <>
              {email && (
                <button
                  type="button"
                  onClick={resend}
                  disabled={resendLoading || status === 'loading'}
                  className="rounded-xl bg-[#003087] py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              )}
              <Link to="/app/login" className="rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
