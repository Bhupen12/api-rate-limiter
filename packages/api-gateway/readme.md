# IP Address Range Categories

This document provides an overview of **IP address range categories** as classified by the [`ipaddr.js`](https://github.com/whitequark/ipaddr.js) library.  
These categories are relevant for functions like `getClientIp`, which filter IPs based on their **routability**.

---

## 📌 Categories

### 1. Private
Private IPs are used in local networks and are **not routable** on the public internet.  
Defined by **RFC 1918**.

**IPv4 Ranges**:
- `10.0.0.0/8` → `10.0.0.0 - 10.255.255.255`  
- `172.16.0.0/12` → `172.16.0.0 - 172.31.255.255`  
- `192.168.0.0/16` → `192.168.0.0 - 192.168.255.255`  

**Examples**:
- `10.0.0.1`  
- `172.16.1.1`  
- `192.168.0.1`  

👉 In `getClientIp`, these IPs are skipped unless they are the only option in `X-Forwarded-For`.

---

### 2. Loopback
Used for a device to talk to itself (testing, local services).

**IPv4 Range**:  
- `127.0.0.0/8` → `127.0.0.0 - 127.255.255.255`  

**IPv6 Range**:  
- `::1/128`  

**Examples**:
- `127.0.0.1`  
- `::1`  

👉 Not routable, only internal.

---

### 3. LinkLocal
Auto-configured addresses for communication within a **single network segment**.  
Defined by **RFC 3927 (IPv4)** and **RFC 4291 (IPv6)**.

**IPv4 Range**:  
- `169.254.0.0/16` → `169.254.0.0 - 169.254.255.255`  

**IPv6 Range**:  
- `fe80::/10`  

**Examples**:
- `169.254.1.1`  
- `fe80::1%eth0`  

👉 Valid only inside a local segment, not routable.

---

### 4. UniqueLocal (IPv6 only)
Private IPv6 addresses for internal networks.  
Defined by **RFC 4193**.

**IPv6 Range**:  
- `fc00::/7` (with 8th bit = 1 → effectively `fd00::/8`)  

**Examples**:
- `fd12:3456:789a::1`  
- `fd00:abcd:1234::1`  

👉 Globally unique but **not public-routable**.

---

### 5. Reserved
Special-purpose addresses (multicast, docs, future use, etc.).

**IPv4 Ranges**:
- `0.0.0.0/8` → "this host"  
- `192.0.2.0/24` → TEST-NET-1 (docs)  
- `198.51.100.0/24` → TEST-NET-2 (docs)  
- `203.0.113.0/24` → TEST-NET-3 (docs)  
- `224.0.0.0/4` → multicast  
- `240.0.0.0/4` → reserved  

**IPv6 Ranges**:
- `ff00::/8` → multicast  
- `2001:db8::/32` → documentation  

**Examples**:
- `0.0.0.0`  
- `192.0.2.1`  
- `203.0.113.1`  
- `2001:db8::1`  
- `ff02::1`  

👉 Not routable in standard networks.

---

## 🚀 Usage Example

You can test IP filtering logic in **Postman** by setting headers:

```js
pm.request.headers.add({ key: 'X-Forwarded-For', value: '10.0.0.1, 127.0.0.1, 203.0.113.1' });
pm.request.headers.add({ key: 'X-Real-IP', value: '169.254.1.1' });
pm.request.headers.add({ key: 'cf-connecting-ip', value: 'fd12:3456:789a::1' });
