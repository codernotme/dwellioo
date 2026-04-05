"use client";

import { useState } from "react";
import { Button, Input, Card, TabsRoot, TabList, Tab, TabPanel, TextField, Label } from "@heroui/react";
import { createOrganization } from "./actions";
import { Building2, Home, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setErrorMsg("");
    const result = await createOrganization(formData);
    if (result?.error) {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome to Dwellioo</h1>
        <p className="text-default-500 mt-2">Let's get your property set up in minutes.</p>
      </div>

      <Card className="p-1 shadow-lg bg-background">
        <div className="p-6">
          <TabsRoot>
            <TabList className="flex gap-4 border-b border-default-200 mb-6 pb-2">
              <Tab id="manager" className="flex items-center gap-2 cursor-pointer outline-none data-[selected]:text-primary data-[selected]:border-b-2 data-[selected]:border-primary pb-2 transition-all">
                <Building2 size={20} />
                <span>I'm a Manager</span>
              </Tab>
              <Tab id="resident" className="flex items-center gap-2 cursor-pointer outline-none data-[selected]:text-primary data-[selected]:border-b-2 data-[selected]:border-primary pb-2 transition-all">
                <Home size={20} />
                <span>I'm a Resident</span>
              </Tab>
            </TabList>

            <TabPanel id="manager">
              <form action={handleSubmit} className="flex flex-col gap-6 mt-6">
                <div className="flex flex-col gap-4">
              <TextField name="name" isRequired className="flex flex-col gap-1">
                <Label className="text-sm font-medium text-default-700">Organization Name</Label>
                <Input 
                  placeholder="e.g. Acme Properties" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </TextField>
              
              <TextField name="propertyName" isRequired className="flex flex-col gap-1">
                <Label className="text-sm font-medium text-default-700">First Property Name</Label>
                <Input 
                  placeholder="e.g. Riverside Apartments" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </TextField>
                </div>

                {errorMsg && <p className="text-danger text-sm">{errorMsg}</p>}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold h-11"
                  isDisabled={loading}
                >
                  {loading ? "Creating..." : "Create Organization"} {!loading && <ArrowRight size={18} className="ml-2 inline" />}
                </Button>
              </form>
            </TabPanel>

            <TabPanel id="resident">
              <div className="flex flex-col gap-6 mt-6">
                <p className="text-sm text-default-600">
                  Join your community's official property portal to manage your dues, 
                  access the helpdesk, and see notice boards.
                </p>
                <TextField isDisabled className="flex flex-col gap-1 opacity-60">
                   <Label className="text-sm font-medium text-default-700">Invite Code / Unit Link Token</Label>
                   <Input 
                     placeholder="Paste your code here"
                     className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                   />
                </TextField>
                <Button variant="secondary" className="w-full font-bold opacity-50 cursor-not-allowed h-11" isDisabled>
                  Coming Soon (Resident Flow)
                </Button>
              </div>
            </TabPanel>
          </TabsRoot>
        </div>
      </Card>
    </div>
  );
}
