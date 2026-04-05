"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Card, Select, Label, ListBox } from "@heroui/react";
import { 
  Building2, 
  Home, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Building,
  UserCircle2,
  Sparkles,
  ChevronDown,
  Loader2
} from "lucide-react";
import { createOrganization } from "./actions";
import confetti from "canvas-confetti";
import { useNotificationModal } from "@/components/providers/notification-provider";
import { useRouter } from "next/navigation";

const onboardingSchema = z.object({
  role: z.enum(["Manager", "Resident"]),
  orgName: z.string().min(3, "Organization name must be at least 3 characters"),
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  propertyType: z.enum(["Society", "Hostel", "PG", "Co_living"]),
  address: z.string().min(5, "Please enter a valid address"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showNotification } = useNotificationModal();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: "Manager",
      propertyType: "Society",
      orgName: "",
      propertyName: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  const role = watch("role");
  const orgName = watch("orgName");

  const nextStep = async () => {
    let isValid = true;
    if (step === 2) isValid = await trigger("orgName");
    
    if (isValid) setStep((s) => s + 1);
  };
  
  const prevStep = () => setStep((s) => s - 1);

  const onSubmit = async (data: OnboardingData) => {
    if (data.role === "Resident") {
      showNotification({
        title: "Coming Soon",
        message: "The Resident onboarding flow is currently being finalized. Please contact your property manager for an invite link.",
        type: "info"
      });
      return;
    }

    const result = await createOrganization(data) as { success?: boolean; error?: string };
    
    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#2563eb", "#9333ea", "#06b6d4"]
        });
      }, 100);
    } else {
      showNotification({
        title: "Onboarding Error",
        message: result.error || "Something went wrong during setup.",
        type: "error"
      });
    }
  };

  const inputStyles = "w-full bg-white/5 h-14 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-default-400 focus:border-primary outline-none transition-all";

  if (isSuccess) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass p-12 rounded-[3.5rem] text-center flex flex-col items-center gap-6 border border-white/10"
        >
          <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="text-success" size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tightest text-white">You're all set!</h1>
          <p className="text-default-400 font-medium leading-relaxed">
            Your organization <span className="text-white font-bold">{orgName}</span> has been created. 
            Redirecting you to your new dashboard...
          </p>
          <Button 
            variant="primary" 
            className="w-full h-14 text-lg font-black tracking-tight mt-4"
            onPress={() => router.push("/dashboard")}
          >
            Enter Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-6 relative overflow-hidden bg-black text-white">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-2xl w-full flex flex-col gap-8 relative z-10">
        {/* Progress Stepper */}
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                step >= i ? "w-12 bg-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "w-4 bg-white/10"
              }`} 
            />
          ))}
        </div>

        <Card className="p-1 rounded-[3rem] overflow-hidden bg-white/5 backdrop-blur-3xl border border-white/10">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="flex flex-col gap-8"
                  >
                    <div className="text-center">
                      <h2 className="text-3xl font-black tracking-tightest mb-2 text-white">Choose Your Path</h2>
                      <p className="text-default-400 font-medium">How will you be using Dwellioo today?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => setValue("role", "Manager")}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-4 group text-left ${
                          role === "Manager" 
                            ? "bg-primary/20 border-primary shadow-lg" 
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${role === "Manager" ? "bg-primary text-white" : "bg-white/10 text-default-400"}`}>
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg text-white">Property Manager</h3>
                          <p className="text-xs text-default-400 font-medium leading-relaxed">Setup your organization and manage multiple properties.</p>
                        </div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setValue("role", "Resident")}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col gap-4 group text-left ${
                          role === "Resident" 
                            ? "bg-secondary/20 border-secondary shadow-lg" 
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${role === "Resident" ? "bg-secondary text-white" : "bg-white/10 text-default-400"}`}>
                          <Home size={24} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg text-white">Resident</h3>
                          <p className="text-xs text-default-400 font-medium leading-relaxed">Join your community to pay dues and access services.</p>
                        </div>
                      </button>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full h-14 text-lg font-black tracking-tight mt-4"
                      onPress={role === "Manager" ? nextStep : () => {
                        showNotification({
                           title: "Resident Flow Incoming",
                           message: "We're currently scaling our resident features. Please check back soon!",
                           type: "info"
                        });
                      }}
                    >
                      Continue
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="flex flex-col gap-8"
                  >
                    <div className="flex items-center gap-4">
                       <Button isIconOnly variant="ghost" className="rounded-full border-white/10" onPress={prevStep}>
                          <ArrowLeft size={18} className="text-white" />
                       </Button>
                       <div>
                          <h2 className="text-2xl font-black tracking-tight text-white">The Organization</h2>
                          <p className="text-default-400 text-sm font-medium">Define your brand identity.</p>
                       </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-bold text-default-400 ml-1 flex items-center gap-2">
                           <Sparkles size={14} className="text-primary" />
                           Organization Name
                        </Label>
                        <Input 
                          {...register("orgName")}
                          placeholder="e.g. Skyline Management"
                          className={inputStyles}
                        />
                        {errors.orgName && <p className="text-danger text-xs font-bold ml-1">{errors.orgName.message}</p>}
                      </div>

                      <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                         <div className="flex gap-4">
                            <Building size={24} className="text-primary mt-1" />
                            <p className="text-sm text-default-400 font-medium leading-relaxed">
                               You'll be able to add multiple buildings, staff members, and residents under this organization later.
                            </p>
                         </div>
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full h-14 text-lg font-black tracking-tight"
                      onPress={nextStep}
                    >
                      Next: Property Setup
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex items-center gap-4">
                       <Button isIconOnly variant="ghost" className="rounded-full border-white/10" onPress={prevStep}>
                          <ArrowLeft size={18} className="text-white" />
                       </Button>
                       <div>
                          <h2 className="text-2xl font-black tracking-tight text-white">The First Property</h2>
                          <p className="text-default-400 text-sm font-medium">Let's setup your primary managing unit.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <Label className="text-sm font-bold text-default-400 ml-1">Property Name</Label>
                        <Input 
                          {...register("propertyName")}
                          placeholder="e.g. Riverside Towers"
                          className={inputStyles}
                        />
                         {errors.propertyName && <p className="text-danger text-xs font-bold ml-1">{errors.propertyName.message}</p>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Controller
                          name="propertyType"
                          control={control}
                          render={({ field }) => (
                            <Select 
                              selectedKey={field.value}
                              onSelectionChange={(key) => field.onChange(key)}
                              className="w-full flex flex-col gap-2"
                            >
                               <Label className="text-sm font-bold text-default-400 ml-1">Property Type</Label>
                               <Select.Trigger className="bg-white/5 h-14 border border-white/10 rounded-xl px-3 flex items-center justify-between text-sm text-white">
                                  <Select.Value />
                                  <ChevronDown size={14} className="text-default-400" />
                               </Select.Trigger>
                               <Select.Popover className="bg-slate-900 border border-white/10 rounded-xl shadow-xl p-1">
                                  <ListBox>
                                     <ListBox.Item id="Society" textValue="Society" className="p-3 hover:bg-white/5 rounded-lg text-sm text-white cursor-pointer transition-colors">Society</ListBox.Item>
                                     <ListBox.Item id="Hostel" textValue="Hostel" className="p-3 hover:bg-white/5 rounded-lg text-sm text-white cursor-pointer transition-colors">Hostel</ListBox.Item>
                                     <ListBox.Item id="PG" textValue="PG" className="p-3 hover:bg-white/5 rounded-lg text-sm text-white cursor-pointer transition-colors">PG</ListBox.Item>
                                     <ListBox.Item id="Co_living" textValue="Co-Living" className="p-3 hover:bg-white/5 rounded-lg text-sm text-white cursor-pointer transition-colors">Co-Living</ListBox.Item>
                                  </ListBox>
                               </Select.Popover>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-bold text-default-400 ml-1">Pincode</Label>
                        <Input 
                          {...register("pincode")}
                          placeholder="6 Digit PIN"
                          className={inputStyles}
                        />
                         {errors.pincode && <p className="text-danger text-xs font-bold ml-1">{errors.pincode.message}</p>}
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2">
                        <Label className="text-sm font-bold text-default-400 ml-1">Address</Label>
                        <Input 
                          {...register("address")}
                          placeholder="Full Street Address"
                          className={inputStyles}
                        />
                         {errors.address && <p className="text-danger text-xs font-bold ml-1">{errors.address.message}</p>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-bold text-default-400 ml-1">City</Label>
                        <Input 
                          {...register("city")}
                          placeholder="City"
                          className={inputStyles}
                        />
                         {errors.city && <p className="text-danger text-xs font-bold ml-1">{errors.city.message}</p>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-bold text-default-400 ml-1">State</Label>
                        <Input 
                          {...register("state")}
                          placeholder="State"
                          className={inputStyles}
                        />
                         {errors.state && <p className="text-danger text-xs font-bold ml-1">{errors.state.message}</p>}
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      variant="primary" 
                      className="w-full h-14 text-lg font-black tracking-tight mt-2 shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
                      isDisabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Setting up...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Setup</span>
                          <ArrowRight size={20} />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </Card>

        {/* Support Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-full text-default-400">
                 <UserCircle2 size={24} />
              </div>
              <div>
                 <p className="text-xs font-bold text-default-400 uppercase tracking-widest text-white/60">Need Assistance?</p>
                 <p className="text-sm font-bold text-white">Talk to a setup specialist</p>
              </div>
           </div>
           <Button variant="ghost" size="sm" className="font-bold border-white/10 text-white">Chat Support</Button>
        </div>
      </div>
    </div>
  );
}
