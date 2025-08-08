import {
  redisService,
  redisHealthMonitor,
  RedisHealthCheck,
} from '@monorepo/shared';

// Example 1: Basic Operations
async function basicOperationsExample() {
  console.log('=== Basic Redis Operations ===');

  // Simple key-value operations
  await redisService.set('user:123', 'John Doe');
  const user = await redisService.get('user:123');
  console.log('User:', user); // Output: John Doe

  // With TTL (Time To Live)
  await redisService.set('session:abc123', 'session_data', { ttl: 3600 });
  const ttl = await redisService.ttl('session:abc123');
  console.log('Session TTL:', ttl); // Output: ~3600

  // Conditional operations
  await redisService.set('counter', '1', { nx: true }); // Only if not exists
  await redisService.set('counter', '2', { xx: true }); // Only if exists

  // Check existence
  const exists = await redisService.exists('counter');
  console.log('Counter exists:', !!exists);

  // Delete
  await redisService.del('counter');
}

// Example 2: JSON Operations
async function jsonOperationsExample() {
  console.log('=== JSON Operations ===');

  interface User {
    id: number;
    name: string;
    email: string;
    preferences: {
      theme: string;
      notifications: boolean;
    };
  }

  const user: User = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  };

  // Store JSON with type safety
  await redisService.setJSON('user:profile:123', user, { ttl: 7200 });

  // Retrieve JSON with type safety
  const retrievedUser = await redisService.getJSON<User>('user:profile:123');
  if (retrievedUser) {
    console.log('Retrieved user:', retrievedUser.name);
    console.log('Theme preference:', retrievedUser.preferences.theme);
  }
}

// Example 3: Hash Operations (for storing object fields)
async function hashOperationsExample() {
  console.log('=== Hash Operations ===');

  // Store user data as hash
  await redisService.hset('user:456', 'name', 'Jane Smith');
  await redisService.hset('user:456', 'email', 'jane@example.com');
  await redisService.hset('user:456', 'lastLogin', Date.now().toString());

  // Get single field
  const name = await redisService.hget('user:456', 'name');
  console.log('User name:', name);

  // Get all fields
  const userData = await redisService.hgetall('user:456');
  console.log('All user data:', userData);

  // Delete a field
  await redisService.hdel('user:456', 'lastLogin');
}

// Example 4: List Operations (for queues, logs, etc.)
async function listOperationsExample() {
  console.log('=== List Operations ===');

  const queueKey = 'task:queue';

  // Add tasks to queue
  await redisService.lpush(queueKey, 'task1', 'task2', 'task3');

  // Get queue length
  const length = await redisService.llen(queueKey);
  console.log('Queue length:', length);

  // Process tasks (FIFO)
  const task = await redisService.rpop(queueKey);
  console.log('Processing task:', task);

  // Or add to end and process from beginning (LIFO)
  await redisService.rpush(queueKey, 'urgent_task');
  const urgentTask = await redisService.lpop(queueKey);
  console.log('Processing urgent task:', urgentTask);
}

// Example 5: Set Operations (for unique collections)
async function setOperationsExample() {
  console.log('=== Set Operations ===');

  const tagsKey = 'article:123:tags';

  // Add tags
  await redisService.sadd(
    tagsKey,
    'javascript',
    'typescript',
    'redis',
    'nodejs'
  );

  // Check if tag exists
  const hasTag = await redisService.sismember(tagsKey, 'typescript');
  console.log('Has typescript tag:', !!hasTag);

  // Get all tags
  const allTags = await redisService.smembers(tagsKey);
  console.log('All tags:', allTags);

  // Remove a tag
  await redisService.srem(tagsKey, 'redis');
}

// Example 6: Health Monitoring
async function healthMonitoringExample() {
  console.log('=== Health Monitoring ===');

  // Basic health check
  const isHealthy = await redisService.ping();
  console.log('Redis is healthy:', isHealthy);

  // Detailed health check
  const healthCheck = await redisService.getHealthCheck();
  console.log('Health status:', healthCheck.status);
  console.log('Latency:', healthCheck.latency + 'ms');
  console.log('Memory used:', healthCheck.memory.used);
  console.log('Connections:', healthCheck.connections);
  console.log('Uptime:', healthCheck.uptime + 's');

  // Connection status
  const connectionStatus = redisService.getConnectionStatus();
  console.log('Connected:', connectionStatus.connected);
  console.log('Ready:', connectionStatus.ready);

  // Server information
  const serverInfo = await redisHealthMonitor.getServerInfo();
  console.log('Redis version:', serverInfo.version);
  console.log('Uptime formatted:', serverInfo.uptime);
  console.log('Commands per second:', serverInfo.commands.perSecond);
}

// Example 7: Express.js Integration
function expressIntegrationExample() {
  console.log('=== Express.js Integration ===');

  // In your Express app setup:
  /*
  import express from 'express';
  import { createRedisHealthMiddleware, redisService } from '@shared/core';
  
  const app = express();
  
  // Health check endpoint
  app.get('/health/redis', createRedisHealthMiddleware());
  
  // Custom middleware for Redis operations
  app.use(async (req, res, next) => {
    // Store request info for analytics
    const requestKey = `request:${Date.now()}:${Math.random()}`;
    await redisService.setJSON(requestKey, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString()
    }, { ttl: 3600 });
    
    next();
  });
  */
}

// Example 8: Error Handling and Graceful Degradation
async function errorHandlingExample() {
  console.log('=== Error Handling ===');

  try {
    // This will gracefully return null if Redis is down
    const value = await redisService.get('some:key');

    if (value) {
      console.log('Retrieved from Redis:', value);
    } else {
      console.log('Key not found or Redis unavailable, using fallback');
      // Implement fallback logic here
    }
  } catch (error) {
    console.error('Redis operation failed:', error);
    // Implement error handling/fallback logic
  }

  // Wait for Redis to become available
  const isAvailable = await redisHealthMonitor.waitForAvailability(10000);
  if (isAvailable) {
    console.log('Redis is now available');
  } else {
    console.log('Redis is still unavailable after timeout');
  }
}

// Example 9: Periodic Health Monitoring
function periodicHealthMonitoringExample() {
  console.log('=== Periodic Health Monitoring ===');

  // Start monitoring every 30 seconds
  redisHealthMonitor.startPeriodicHealthCheck(30000);

  // Register callback for health updates
  redisHealthMonitor.onHealthCheck((health: RedisHealthCheck) => {
    console.log(`Health check: ${health.status} (${health.latency}ms)`);

    if (health.status === 'unhealthy') {
      // Send alert, log error, etc.
      console.error('Redis is unhealthy!');
    }
  });

  // Stop monitoring when needed (e.g., on app shutdown)
  // redisHealthMonitor.stopPeriodicHealthCheck();
}

// Example 10: Application Shutdown
async function shutdownExample() {
  console.log('=== Application Shutdown ===');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');

    // Stop health monitoring
    redisHealthMonitor.stopPeriodicHealthCheck();

    // Close Redis connection
    await redisService.quit();

    process.exit(0);
  });
}

// Run examples
async function runExamples() {
  try {
    await basicOperationsExample();
    await jsonOperationsExample();
    await hashOperationsExample();
    await listOperationsExample();
    await setOperationsExample();
    await healthMonitoringExample();
    expressIntegrationExample();
    await errorHandlingExample();
    periodicHealthMonitoringExample();
    shutdownExample();
  } catch (error) {
    console.error('Example failed:', error);
  }
}

export { runExamples };
