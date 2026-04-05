"use client";

import { Card, Button, Table, Chip, TabsRoot, TabList, Tab, TabPanel, TextField, Label, Input } from "@heroui/react";
import { Building2, Landmark, ShieldCheck, MapPin } from "lucide-react";

export function SettingsTabs({ account, properties }: { account: any, properties: any[] }) {
  return (
    <div className="w-full">
      <TabsRoot className="w-full">
        <TabList className="flex gap-6 border-b border-default-200 mb-8 pb-3">
          <Tab id="organization" className="flex items-center gap-2 cursor-pointer outline-none data-[selected]:text-primary data-[selected]:border-b-2 data-[selected]:border-primary pb-3 transition-all font-bold text-sm">
            <Building2 size={16} />
            Organization
          </Tab>
          <Tab id="properties" className="flex items-center gap-2 cursor-pointer outline-none data-[selected]:text-primary data-[selected]:border-b-2 data-[selected]:border-primary pb-3 transition-all font-bold text-sm">
            <Landmark size={16} />
            Properties
          </Tab>
          <Tab id="security" className="flex items-center gap-2 cursor-pointer outline-none data-[selected]:text-primary data-[selected]:border-b-2 data-[selected]:border-primary pb-3 transition-all font-bold text-sm">
            <ShieldCheck size={16} />
            Security
          </Tab>
        </TabList>

        <TabPanel id="organization">
          <Card className="p-8 border border-default-200 bg-background shadow-sm">
            <h3 className="text-xl font-bold mb-6">Organization Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <TextField name="orgName" defaultValue={account?.name} className="flex flex-col gap-1.5" isReadOnly={false}>
                <Label className="text-sm font-bold text-default-700">Organization Name</Label>
                <Input className="flex h-11 w-full rounded-lg border border-default-300 bg-background px-4 py-2 text-sm" />
              </TextField>
              <TextField isReadOnly defaultValue={account?.slug} className="flex flex-col gap-1.5 opacity-70">
                <Label className="text-sm font-bold text-default-700">Organization Slug</Label>
                <Input className="flex h-11 w-full rounded-lg border border-default-300 bg-default-100 px-4 py-2 text-sm italic" />
              </TextField>
              <TextField isReadOnly defaultValue={account?.plan} className="flex flex-col gap-1.5 opacity-70">
                <Label className="text-sm font-bold text-default-700">Current Subscription Plan</Label>
                <Input className="flex h-11 w-full rounded-lg border border-default-300 bg-default-100 px-4 py-2 text-sm uppercase tracking-wider font-black" />
              </TextField>
            </div>
            <div>
              <Button variant="primary" className="h-11 px-8 font-bold text-sm">Update Organization</Button>
            </div>
          </Card>
        </TabPanel>

        <TabPanel id="properties">
          <Card className="p-8 border border-default-200 bg-background shadow-sm">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-bold">Properties Managed</h3>
               <Button variant="outline" className="h-10 px-4 font-bold text-xs">Add New Property</Button>
             </div>
             
             <Table aria-label="Properties List" className="border border-default-100 rounded-xl overflow-hidden">
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column>NAME</Table.Column>
                      <Table.Column>LOCATION</Table.Column>
                      <Table.Column>TYPE</Table.Column>
                      <Table.Column>UNITS</Table.Column>
                      <Table.Column>STATUS</Table.Column>
                    </Table.Header>
                    <Table.Body renderEmptyState={() => "No properties found."}>
                      {properties.map((property) => (
                        <Table.Row key={property.id}>
                          <Table.Cell>
                            <span className="font-black text-sm text-primary">{property.name}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2 text-default-500 font-medium text-xs">
                              <MapPin size={14} />
                              <span>{property.city || "Not set"}, {property.state || ""}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                             <Chip size="sm" variant="soft" color="accent" className="font-bold text-[10px]">{property.type}</Chip>
                          </Table.Cell>
                          <Table.Cell>
                             <span className="text-sm font-black tracking-tighter text-default-600">24 UNITS</span>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip size="sm" color="success" variant="soft" className="font-black">ACTIVE</Chip>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
             </Table>
          </Card>
        </TabPanel>

        <TabPanel id="security">
          <Card className="p-8 border border-default-200 bg-background shadow-sm">
            <h3 className="text-xl font-bold mb-4">Security Policies</h3>
            <p className="text-default-500 text-sm mb-8 font-medium">Manage global authentication and access controls for your properties.</p>
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between p-5 border border-default-200 rounded-xl hover:bg-default-50 transition-colors">
                 <div>
                   <p className="font-bold text-sm">Force Visitor OTP</p>
                   <p className="text-xs text-default-500 font-medium">Require all walk-in visitors to verify via OTP sent to resident.</p>
                 </div>
                 <Chip color="success" variant="soft" className="font-black">ENABLED</Chip>
               </div>
               <div className="flex items-center justify-between p-5 border border-default-200 rounded-xl hover:bg-default-50 transition-colors">
                 <div>
                   <p className="font-bold text-sm">Auto-Approve Residents</p>
                   <p className="text-xs text-default-500 font-medium">Allow residents to join properties without manager approval if they have a valid invite link.</p>
                 </div>
                 <Chip color="default" variant="soft" className="font-black">DISABLED</Chip>
               </div>
            </div>
          </Card>
        </TabPanel>
      </TabsRoot>
    </div>
  );
}
