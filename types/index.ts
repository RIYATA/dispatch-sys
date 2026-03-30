export type TaskStatus = 'Pending' | 'Assigned' | 'In_Progress' | 'Completed' | 'Failure' | 'Reschedule';
export type TaskPriority = 'Normal' | 'High' | 'Urgent';
export type CPStatus = 'Idle' | 'Busy' | 'Offline';

export interface Task {
 id: string;
 customerName: string;
 phoneNumber: string;
 address: string;
 appointmentTime: string;
 submissionTime: string;
 status: TaskStatus;
 cpName: string;
 teamId?: string;
 priority: 'Normal' | 'Urgent';
 feedback: string;
 isAccessControlEntry: boolean;
 adminNote: string;
 points: number;
 promotionPoints?: number;
 newInstallPoints?: number;
 stockPoints?: number;
 isKeyPersonHome: boolean;
 isHighValue: boolean;
 isNonResident?: boolean;
 projectName?: string;
 hasOpportunity: boolean;
 opportunityNotes: string;
 carrierInfo: string;
 visitResult: 'success' | 'reschedule' | 'no_answer' | 'rejected' | 'other';
 isCompetitorUser: boolean;
 competitorSpending: string;
 conversionChance: 'high' | 'medium' | 'low' | '';
 isWeChatAdded: boolean;
 residentCount?: number;
 monthlySpending?: string;
 isCompanyBill?: boolean;
 isElderlyHome: boolean;
 originalAppointmentTime: string;
 completedAt: string;
 tags?: string[];
 competitorExpirationDate?: string;
 actualStaffIds?: string[];
 actualStaffNames?: string[];
}

export interface CP {
 id: string;
 name: string; // Now represents "Team Name" e.g., "Name1, Name2"
 status: 'Idle' | 'Busy' | 'Offline';
 currentTaskId?: string | null;
 color: string; // e.g., 'blue', 'cyan', 'teal', 'indigo'
}

export interface Staff {
 id: string;
 name: string;
}
