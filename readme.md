# Save these commands in a text file for daily use

# 🟢 START REDIS (run this in a separate CMD window)
docker start my-redis

# 🔍 CHECK IF REDIS IS RUNNING
docker ps

# 🧪 QUICK TEST REDIS
docker exec -it my-redis redis-cli -a yourpassword123 ping

# 📊 MONITOR REDIS (see real-time commands)
docker exec -it my-redis redis-cli -a yourpassword123 monitor

# 🗂️ CONNECT TO REDIS CLI (for manual commands)
docker exec -it my-redis redis-cli -a yourpassword123

# 📋 VIEW REDIS LOGS
docker logs my-redis

# 🔄 RESTART REDIS (if needed)
docker restart my-redis

# 🛑 STOP REDIS (when done developing)
docker stop my-redis

# 🧹 CLEAR REDIS DATA (flush all data)
docker exec -it my-redis redis-cli -a yourpassword123 flushall

# 📈 GET REDIS INFO
docker exec -it my-redis redis-cli -a yourpassword123 info

# Common Redis CLI commands once connected:
# PING                    - Test connection
# SET key value           - Set a key
# GET key                 - Get a key
# KEYS *                  - Show all keys
# FLUSHALL               - Clear all data
# INFO                   - Show server info
# QUIT                   - Exit CLI