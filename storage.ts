import { 
  users, 
  contactSubmissions, 
  pageViews,
  events,
  clients,
  projects,
  engineers,
  projectAssignments,
  type User, 
  type InsertUser, 
  type ContactSubmission, 
  type InsertContactSubmission,
  type PageView,
  type InsertPageView,
  type Event,
  type InsertEvent,
  type Client,
  type InsertClient,
  type Project,
  type InsertProject,
  type Engineer,
  type InsertEngineer
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;
  
  // Analytics methods
  createPageView(pageView: InsertPageView): Promise<PageView>;
  createEvent(event: InsertEvent): Promise<Event>;
  getAnalyticsDashboard(): Promise<any>;
  
  // Client portal methods
  createClient(client: InsertClient): Promise<Client>;
  getClientProjects(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  getAvailableEngineers(): Promise<Engineer[]>;
  
  // CRM methods
  updateContactSubmissionStatus(id: number, status: string, assignedTo?: number): Promise<ContactSubmission>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db
      .insert(contactSubmissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  // Analytics methods
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const [view] = await db.insert(pageViews).values(pageView).returning();
    return view;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [eventRecord] = await db.insert(events).values(event).returning();
    return eventRecord;
  }

  async getAnalyticsDashboard(): Promise<any> {
    const [totalVisitors] = await db.select({ count: count() }).from(pageViews);
    const [totalPageViews] = await db.select({ count: count() }).from(pageViews);
    const [totalContacts] = await db.select({ count: count() }).from(contactSubmissions);
    
    const conversionRate = totalVisitors.count > 0 ? 
      Math.round((totalContacts.count / totalVisitors.count) * 100 * 100) / 100 : 0;

    const topPages = await db
      .select({
        path: pageViews.path,
        views: count()
      })
      .from(pageViews)
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(5);

    const recentSubmissions = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(5);

    return {
      totalVisitors: totalVisitors.count,
      pageViews: totalPageViews.count,
      contactForms: totalContacts.count,
      conversionRate,
      topPages,
      recentSubmissions,
      monthlyStats: [] // Would implement with date grouping
    };
  }

  // Client portal methods
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async getClientProjects(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getAvailableEngineers(): Promise<Engineer[]> {
    return await db.select().from(engineers).where(eq(engineers.availability, 'available'));
  }

  // CRM methods
  async updateContactSubmissionStatus(id: number, status: string, assignedTo?: number): Promise<ContactSubmission> {
    const updateData: any = { status, updatedAt: new Date() };
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    const [updated] = await db
      .update(contactSubmissions)
      .set(updateData)
      .where(eq(contactSubmissions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
