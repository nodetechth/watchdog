import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Job, JobCreateInput, JobStore } from "../types";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE_NAME || "watchdog-jobs";

export const awsJobStore: JobStore = {
  async createJob(input: JobCreateInput): Promise<void> {
    const job: Job = {
      jobId: input.jobId,
      status: "pending",
      url: input.url,
      evidenceNumber: input.evidenceNumber,
      evidenceType: input.evidenceType,
      customClaimText: input.customClaimText ?? null,
      pdfKey: null,
      docxKey: null,
      hashValue: null,
      capturedAt: null,
      createdAt: input.createdAt,
      errorMessage: null,
      userId: input.userId,
      userPlan: input.userPlan ?? "guest",
      expiresAt: input.expiresAt,
      isPaid: false,
    };

    await docClient.send(
      new PutCommand({
        TableName: DYNAMODB_TABLE,
        Item: job,
      })
    );
  },

  async getJob(jobId: string): Promise<Job | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: DYNAMODB_TABLE,
        Key: { jobId },
      })
    );

    if (!result.Item) {
      return null;
    }

    return result.Item as Job;
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    });

    if (updateExpressions.length === 0) {
      return;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: DYNAMODB_TABLE,
        Key: { jobId },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  },

  async listJobsByUser(userId: string): Promise<Job[]> {
    // Note: This requires a GSI on userId for efficient querying
    // For now, using Scan with filter (not efficient for large datasets)
    const result = await docClient.send(
      new ScanCommand({
        TableName: DYNAMODB_TABLE,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const jobs = (result.Items || []) as Job[];
    return jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async listAllJobs(): Promise<Job[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: DYNAMODB_TABLE,
      })
    );

    return (result.Items || []) as Job[];
  },

  async deleteJob(jobId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: DYNAMODB_TABLE,
        Key: { jobId },
      })
    );
  },
};
