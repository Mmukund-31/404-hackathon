import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertClientSchema, insertProjectSchema, insertPageViewSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      
      res.json({ 
        success: true, 
        message: "Contact form submitted successfully. We'll get back to you within 48 hours!",
        submissionId: submission.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Please check your form data",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "An error occurred while submitting your form. Please try again." 
        });
      }
    }
  });

  // Get all contact submissions (for admin purposes)
  app.get("/api/contact-submissions", async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve contact submissions" 
      });
    }
  });

  // Analytics endpoints
  app.post("/api/analytics/pageview", async (req, res) => {
    try {
      const validatedData = insertPageViewSchema.parse(req.body);
      const pageView = await storage.createPageView(validatedData);
      res.json({ success: true, id: pageView.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: "Failed to track page view" });
      }
    }
  });

  app.post("/api/analytics/event", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.json({ success: true, id: event.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: "Failed to track event" });
      }
    }
  });

  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const dashboardData = await storage.getAnalyticsDashboard();
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve analytics data" 
      });
    }
  });

  // Client portal endpoints
  app.post("/api/client", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.json({ success: true, client });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: "Failed to create client" });
      }
    }
  });

  app.get("/api/client/projects", async (req, res) => {
    try {
      const clientId = 1; // Would get from authentication
      const projects = await storage.getClientProjects(clientId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve projects" 
      });
    }
  });

  app.post("/api/client/projects", async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        clientId: 1, // Would get from authentication
        status: "planning"
      };
      const validatedData = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedData);
      res.json({ success: true, project });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: "Failed to create project" });
      }
    }
  });

  app.get("/api/engineers/available", async (req, res) => {
    try {
      const engineers = await storage.getAvailableEngineers();
      res.json(engineers);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve engineers" 
      });
    }
  });

  // CRM endpoints
  app.patch("/api/contact-submissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, assignedTo } = req.body;
      const submission = await storage.updateContactSubmissionStatus(id, status, assignedTo);
      res.json({ success: true, submission });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update submission" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
