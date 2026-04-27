"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "password" | "otp";

export default function AdminLogin() {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [enableCaptcha, setEnableCaptcha] = useState(false);
  const [captchaNum1, setCaptchaNum1] = useState(1);
  const [captchaNum2, setCaptchaNum2] = useState(1);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.enableCaptcha) {
          setEnableCaptcha(true);
          setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
          setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
        }
      })
      .catch(() => {});
  }, []);

  const handlePassword = async () => {
    setLoading(true);
    setError("");

    if (enableCaptcha) {
      if (parseInt(captchaAnswer) !== captchaNum1 + captchaNum2) {
        setError("Incorrect security answer.");
        setLoading(false);
        setCaptchaAnswer("");
        setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
        setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CAPTCHA_FAILED_ADMIN_LOGIN', details: `Failed admin login captcha` })
        });
        return;
      }
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      if (data.requireOtp) {
        setStep("otp");
      } else {
        window.location.href = "/admin";
      }
    } else {
      setError(data.error || "Invalid password");
    }
  };

  const handleOtp = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
    } else {
      setError(data.error || "Invalid OTP");
      if (res.status === 429 || (data.error && data.error.includes("expired"))) {
        setTimeout(() => {
          setStep("password");
          setOtp("");
          setPassword("");
          setError("");
        }, 3000);
      }
    }
  };

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="card max-w-sm w-full p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🌿</div>
          <h1 className="font-serif text-2xl text-grove-700">Admin Access</h1>
          <p className="text-bark-400 text-sm mt-1">Fresh Picks Dashboard</p>
        </div>

        {step === "password" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm text-bark-400 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePassword()}
              />
            </div>
            
            {enableCaptcha && (
              <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-sm font-medium text-amber-800 flex-1">
                  Security Check: What is {captchaNum1} + {captchaNum2}?
                </span>
                <input
                  type="text"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-16 border border-amber-300 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="?"
                  onKeyDown={(e) => e.key === "Enter" && handlePassword()}
                />
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <button
              onClick={handlePassword}
              disabled={loading || !password}
              className="btn-primary w-full"
            >
              {loading ? "Checking…" : "Continue →"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-grove-50 border border-grove-200 rounded-xl p-4 text-center">
              <p className="text-sm text-grove-700">
                A 6-digit OTP has been sent to your admin email. Enter it below.
              </p>
            </div>
            <div>
              <label className="block text-sm text-bark-400 mb-1">
                One-Time Password
              </label>
              <input
                type="text"
                className="input text-center font-mono text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleOtp()}
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <button
              onClick={handleOtp}
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? "Verifying…" : "Login to Dashboard"}
            </button>
            <button
              onClick={() => {
                setStep("password");
                setOtp("");
                setError("");
              }}
              className="w-full text-bark-400 text-sm hover:text-bark-600 transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
