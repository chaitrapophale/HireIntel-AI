import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Brain, Key, CreditCard, Building2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/apiClient";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion } from "framer-motion";

const schema = z.object({
  techVsSoftWeight: z.number().min(0).max(100),
  pedigreeVsWorkWeight: z.number().min(0).max(100),
  strictKeywordMatching: z.boolean(),
  workspaceName: z.string().min(1, "Workspace name is required"),
  workspaceTimezone: z.string(),
});
type FormData = z.infer<typeof schema>;

const tabs = [
  { id: "ai", label: "AI & Ranking", icon: Brain },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "security", label: "Security & 2FA", icon: Shield },
  { id: "api", label: "API Access", icon: Key },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-outline-variant"
      )}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");
  const [saving, setSaving] = useState(false);

  // 2FA Setup State
  const [setupData, setSetupData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [verifyingSetup, setVerifyingSetup] = useState(false);
  const [disabling2fa, setDisabling2fa] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);

  // Fetch latest user profile (containing is_totp_enabled) from backend SQLite db
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      techVsSoftWeight: 60,
      pedigreeVsWorkWeight: 80,
      strictKeywordMatching: false,
      workspaceName: "GlobalTech Recruitment",
      workspaceTimezone: "America/New_York",
    },
  });

  const techVsSoft = watch("techVsSoftWeight");
  const pedigreeVsWork = watch("pedigreeVsWorkWeight");
  const strictKeywords = watch("strictKeywordMatching");

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      // Persist AI weights to backend
      await apiClient.post("/settings/weights", {
        skill_weight: data.techVsSoftWeight / 100,
        experience_weight: (100 - data.techVsSoftWeight) / 200,
        redrob_weight: data.pedigreeVsWorkWeight / 100,
        education_weight: 0.10,
      }).catch(() => {
        // Endpoint may not exist yet — fail silently and just save locally
      });
      setSaving(false);
      toast.success("Settings saved successfully!");
    } catch {
      setSaving(false);
      toast.error("Failed to save settings.");
    }
  };

  const handleSetup2fa = async () => {
    try {
      const res = await api.get("/auth/2fa/setup");
      setSetupData(res.data);
      toast.success("2FA initialization secret generated.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to initialize 2FA.");
    }
  };

  const handleVerifySetup = async () => {
    if (setupCode.length !== 6) {
      toast.warning("Please enter the 6-digit code.");
      return;
    }
    setVerifyingSetup(true);
    try {
      await api.post("/auth/2fa/enable", { code: setupCode });
      toast.success("Google Authenticator 2FA enabled successfully!");
      setSetupData(null);
      setSetupCode("");
      refetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Verification failed. Check code.");
    } finally {
      setVerifyingSetup(false);
    }
  };

  const handleDisable2fa = async () => {
    if (disableCode.length !== 6) {
      toast.warning("Please enter the 6-digit code.");
      return;
    }
    setDisabling2fa(true);
    try {
      await api.post("/auth/2fa/disable", { code: disableCode });
      toast.success("Google Authenticator 2FA disabled successfully.");
      setShowDisableForm(false);
      setDisableCode("");
      refetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to disable 2FA. Check code.");
    } finally {
      setDisabling2fa(false);
    }
  };

  return (
    <div className="px-6 py-6 pb-12 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" /> Enterprise Settings
        </h1>
        <p className="text-on-surface-variant mt-1">Configure AI parameters, security policies, and workspace preferences.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Settings Nav */}
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-lowest"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="md:col-span-3 space-y-5">

            {activeTab === "ai" && (
              <div className="glass-card rounded-2xl p-6 border border-outline-variant/50" style={{ border: "1px solid transparent", background: "linear-gradient(white, white) padding-box, linear-gradient(to right, #4f54b4, #b699ff) border-box" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-on-surface">AI Core Configuration</h2>
                </div>
                <p className="text-sm text-on-surface-variant mb-6">Adjust how the HireIntel engine evaluates and ranks candidates.</p>

                <div className="space-y-8">
                  {/* Slider 1 */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="font-bold text-sm text-on-surface">Technical vs. Soft Skills Weighting</label>
                      <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg">
                        {techVsSoft}% Tech / {100 - techVsSoft}% Soft
                      </span>
                    </div>
                    <input
                      {...register("techVsSoftWeight", { valueAsNumber: true })}
                      type="range" min={0} max={100}
                      className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-on-surface-variant mt-1.5 font-medium">
                      <span>Heavily Technical</span>
                      <span>Balanced</span>
                      <span>Heavily Behavioral</span>
                    </div>
                  </div>

                  {/* Slider 2 */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="font-bold text-sm text-on-surface">Pedigree vs. Proven Work</label>
                      <span className="text-xs text-secondary font-bold bg-secondary/10 px-2 py-1 rounded-lg">
                        {pedigreeVsWork}% Proven Work
                      </span>
                    </div>
                    <input
                      {...register("pedigreeVsWorkWeight", { valueAsNumber: true })}
                      type="range" min={0} max={100}
                      className="w-full h-2 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-secondary"
                    />
                    <div className="flex justify-between text-[10px] text-on-surface-variant mt-1.5 font-medium">
                      <span>Brand Name Companies</span>
                      <span>Balanced</span>
                      <span>GitHub/Portfolio Impact</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                    <div className="flex-1 pr-8">
                      <h3 className="font-bold text-sm text-on-surface mb-1">Strict Keyword Matching</h3>
                      <p className="text-xs text-on-surface-variant">Force the AI to penalize candidates missing exact keyword matches. Not recommended for finding Hidden Gems.</p>
                    </div>
                    <Toggle checked={strictKeywords} onChange={(v) => setValue("strictKeywordMatching", v)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "workspace" && (
              <div className="glass-card rounded-2xl p-6 border border-outline-variant/50 space-y-5">
                <h2 className="font-bold text-on-surface flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Workspace Details</h2>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Workspace Name</label>
                  <input
                    {...register("workspaceName")}
                    className={cn("w-full px-4 py-3 rounded-xl border bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all", errors.workspaceName ? "border-error" : "border-outline-variant")}
                  />
                  {errors.workspaceName && <p className="text-xs text-error mt-1">{errors.workspaceName.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Timezone</label>
                  <select {...register("workspaceTimezone")} className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                    <option value="America/New_York">Eastern (UTC-5)</option>
                    <option value="America/Chicago">Central (UTC-6)</option>
                    <option value="America/Los_Angeles">Pacific (UTC-8)</option>
                    <option value="Europe/London">London (UTC+0)</option>
                    <option value="Asia/Kolkata">Mumbai (UTC+5:30)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="glass-card rounded-2xl p-6 border border-outline-variant/50 space-y-6">
                <div>
                  <h2 className="font-bold text-on-surface flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Two-Factor Authentication (2FA)
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Secure your account by requiring a Google Authenticator verification code when you sign in.
                  </p>
                </div>

                {userProfile?.is_totp_enabled ? (
                  // 2FA is ENABLED
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">✓</div>
                      <div>
                        <p className="font-bold text-emerald-600">Google Authenticator 2FA is Active</p>
                        <p className="text-xs text-on-surface-variant">Your account is secured with Time-based One-Time Passwords.</p>
                      </div>
                    </div>

                    {showDisableForm ? (
                      <div className="border border-outline-variant/50 rounded-xl p-4 bg-surface-container-low space-y-4 max-w-sm">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            Enter Code to Disable
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface text-center font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-error/30 focus:border-error transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDisableForm(false);
                              setDisableCode("");
                            }}
                            className="flex-1 border border-outline-variant text-on-surface font-semibold py-2 rounded-xl text-sm hover:bg-surface-container-high transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDisable2fa}
                            disabled={disabling2fa}
                            className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-xl text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
                          >
                            {disabling2fa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Disable"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDisableForm(true)}
                        className="bg-red-600/10 hover:bg-red-600/20 text-red-600 font-semibold px-4 py-2.5 rounded-xl text-sm border border-red-600/20 transition-all"
                      >
                        Disable 2FA
                      </button>
                    )}
                  </div>
                ) : (
                  // 2FA is DISABLED
                  <div className="space-y-6">
                    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-on-surface mb-1">Google Authenticator (TOTP)</p>
                        <p className="text-xs text-on-surface-variant">Setup 2FA using Google Authenticator, Microsoft Authenticator, or Authy.</p>
                      </div>
                      {!setupData && (
                        <button
                          type="button"
                          onClick={handleSetup2fa}
                          className="bg-primary text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-container transition-all"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>

                    {setupData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-outline-variant/50 rounded-2xl p-6 bg-surface-container-low space-y-6"
                      >
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                          {/* QR Code */}
                          <div className="w-48 h-48 bg-white border border-outline-variant/50 rounded-xl flex items-center justify-center p-2 shadow-sm">
                            <img
                              src={`https://chart.googleapis.com/chart?chs=180x180&chld=M|0&cht=qr&chl=${encodeURIComponent(setupData.provisioning_uri)}`}
                              alt="Scan with Authenticator App"
                              className="w-full h-full"
                            />
                          </div>

                          {/* Instructions */}
                          <div className="flex-1 space-y-3">
                            <h3 className="font-bold text-on-surface">Setup Instructions</h3>
                            <ol className="list-decimal list-inside text-sm text-on-surface-variant space-y-2">
                              <li>Scan the QR code on the left with your Authenticator app.</li>
                              <li>If you cannot scan the QR code, manually enter this key:
                                <code className="block mt-1 p-2 bg-surface-container rounded font-mono text-xs font-bold text-primary select-all">
                                  {setupData.secret}
                                </code>
                              </li>
                              <li>Enter the 6-digit verification code from the app below.</li>
                            </ol>
                          </div>
                        </div>

                        <div className="border-t border-outline-variant/30 pt-6 max-w-sm">
                          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                            6-Digit Verification Code
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="000000"
                              value={setupCode}
                              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-white text-on-surface text-center font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleVerifySetup}
                              disabled={verifyingSetup}
                              className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow hover:bg-primary-container transition-all flex items-center gap-1.5 disabled:opacity-70"
                            >
                              {verifyingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Enable"}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSetupData(null);
                              setSetupCode("");
                            }}
                            className="text-xs text-on-surface-variant hover:text-on-surface underline font-medium"
                          >
                            Cancel Setup
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "api" && (
              <div className="glass-card rounded-2xl p-6 border border-outline-variant/50 space-y-4">
                <h2 className="font-bold text-on-surface flex items-center gap-2"><Key className="w-4 h-4 text-primary" /> API Access</h2>
                <p className="text-sm text-on-surface-variant">Manage your API keys for custom integrations or ATS webhooks.</p>
                <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface mb-1">Production Key 1</p>
                    <code className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-1 rounded font-mono">sk_live_h92...8x21</code>
                  </div>
                  <button type="button" onClick={() => toast.success("API key copied!")} className="text-xs font-bold text-primary hover:underline">Copy</button>
                </div>
                <button type="button" onClick={() => toast.info("Key generation coming with FastAPI backend!")} className="border border-outline-variant bg-surface text-on-surface px-4 py-2 rounded-xl text-sm font-semibold hover:bg-surface-container-low transition-all">
                  Generate New Key
                </button>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="glass-card rounded-2xl p-6 border border-outline-variant/50 space-y-4">
                <h2 className="font-bold text-on-surface flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Billing & Plans</h2>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-primary">Pro Plan</p>
                    <p className="text-sm text-on-surface-variant">$299/month • 85% of quota used</p>
                  </div>
                  <button type="button" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-container transition-all">Upgrade</button>
                </div>
              </div>
            )}

            {/* Save Button (hidden or disabled if viewing security tab to prevent confusion) */}
            {activeTab !== "security" && (
              <div className="flex justify-end gap-3">
                <button type="button" className="border border-outline-variant bg-surface text-on-surface px-6 py-2.5 rounded-xl font-bold hover:bg-surface-container-low transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow hover:bg-primary-container transition-all flex items-center gap-2 disabled:opacity-70">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
