import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Zap, Eye, EyeOff, Shield, CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().email("Please enter a valid work email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [currentUser, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email: data.email,
          createdAt: new Date().toISOString()
        });
        toast.success("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast.success("Welcome back!");
      }
      navigate("/app/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-1 relative bg-primary overflow-hidden items-center justify-center p-12">
        {/* Background orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-tertiary-container rounded-full blur-[100px] opacity-20" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">HireIntel AI</h1>
          </div>
          <p className="text-2xl font-semibold text-white/80 mb-10 leading-relaxed">
            Beyond Keywords.<br />Rank Talent by Real Fit.
          </p>

          {/* Mock UI Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1.5">
                <div className="h-2 w-28 bg-white/30 rounded-full" />
                <div className="h-2 w-16 bg-white/20 rounded-full" />
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-white/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 bg-white/30 rounded-full" />
                  <div className="h-2 w-1/4 bg-white/20 rounded-full" />
                </div>
                <div className="px-3 py-1 rounded-full bg-secondary-container/40 text-[11px] text-white font-bold border border-secondary-container/50">
                  98% Fit
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 opacity-60">
                <div className="w-10 h-10 rounded-full bg-white/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 bg-white/30 rounded-full" />
                  <div className="h-2 w-1/3 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-6 text-white/40 text-xs font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Enterprise Ready</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> SOC2 Compliant</span>
          </div>
        </motion.div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-5 py-12 bg-surface">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-2xl font-black text-primary">HireIntel AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2">{isSignUp ? "Create an account" : "Welcome back"}</h2>
            <p className="text-on-surface-variant">Please enter your details to {isSignUp ? "sign up" : "sign in"}.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="name@company.com"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-white text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all",
                  errors.email ? "border-error" : "border-outline-variant"
                )}
              />
              {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs font-semibold text-secondary hover:text-primary transition-colors">Forgot Password?</a>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-white text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all pr-12",
                    errors.password ? "border-error" : "border-outline-variant"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface-variant transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-error mt-1">{errors.password.message}</p>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input {...register("rememberMe")} type="checkbox" id="remember" className="w-4 h-4 rounded accent-primary" />
              <label htmlFor="remember" className="text-sm text-on-surface-variant cursor-pointer">Remember me for 30 days</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isSignUp ? "Creating Account…" : "Signing In…"}</> : (isSignUp ? "Create Account" : "Sign In")}
            </button>

            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full bg-white border border-outline-variant text-on-surface font-bold py-3.5 rounded-xl hover:bg-surface-container-low active:scale-[0.98] transition-all"
            >
              {isSignUp ? "Already have an account? Sign In" : "Create Account"}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-surface text-on-surface-variant">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Google", "Microsoft", "LinkedIn"].map((p) => (
              <button key={p} className="flex items-center justify-center p-3 rounded-xl border border-outline-variant bg-white hover:bg-surface-container-low transition-colors text-xs font-medium text-on-surface-variant">
                {p}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-on-surface-variant/60">
            By signing in, you agree to our{" "}
            <a href="#" className="underline hover:text-primary">Terms of Service</a> and{" "}
            <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
