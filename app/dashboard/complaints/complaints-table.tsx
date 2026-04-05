"use client";

import { Table, Chip } from "@heroui/react";

const priorityColorMap: Record<string, "danger" | "warning" | "success" | "default"> = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

const statusColorMap: Record<string, "danger" | "warning" | "success" | "default" | "accent"> = {
  Open: "danger",
  Assigned: "accent",
  In_Progress: "warning",
  Resolved: "success",
  Closed: "default",
};

export function ComplaintsTable({ complaints }: { complaints: any[] }) {
  return (
    <Table aria-label="Complaints Table" className="bg-background rounded-large shadow-sm">
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column>TICKET ID</Table.Column>
            <Table.Column>RESIDENT</Table.Column>
            <Table.Column>CATEGORY</Table.Column>
            <Table.Column>PRIORITY</Table.Column>
            <Table.Column>STATUS</Table.Column>
            <Table.Column>CREATED AT</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "No complaints found."}>
            {complaints.map((complaint) => {
              const resident = complaint.residents;
              const profile = resident?.profiles;

              return (
                <Table.Row key={complaint.id}>
                  <Table.Cell>
                    <span className="font-mono text-sm">{complaint.ticket_id}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      {profile?.avatar_url && <img src={profile.avatar_url} className="w-6 h-6 rounded-full" alt="avatar" />}
                      <span className="text-sm">{profile?.full_name || "Unknown"}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{complaint.category}</Table.Cell>
                  <Table.Cell>
                    <Chip
                      color={priorityColorMap[complaint.priority] || "default"}
                      size="sm"
                      variant="soft"
                    >
                      {complaint.priority}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      color={(statusColorMap[complaint.status] as "danger" | "warning" | "success" | "default" | "accent") || "default"}
                      size="sm"
                      variant="soft"
                    >
                      {complaint.status.replace("_", " ")}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
