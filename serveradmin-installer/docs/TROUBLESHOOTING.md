# TROUBLESHOOTING.md

# Troubleshooting Tips for Server Admin Installer

## Common Issues and Solutions

### 1. Installation Fails with "Permission Denied"
- Ensure you are running the installation script with root privileges. Use `sudo` to execute the script.

### 2. Unable to Detect Public IP
- Check your internet connection. If you are behind a firewall or proxy, ensure that it allows outbound connections to the internet.

### 3. NGINX Fails to Start
- Check the NGINX error logs located at `/var/log/nginx/error.log` for more details on the failure.
- Ensure that the configuration file is valid by running `nginx -t`.

### 4. PostgreSQL Database Connection Issues
- Verify that PostgreSQL is running with `systemctl status postgresql`.
- Check the database connection settings in your application configuration.

### 5. SSL Certificate Not Issued
- Ensure that your domain is correctly pointed to your server's public IP.
- Check the Certbot logs for any errors during the SSL certificate issuance process.

### 6. Insufficient Disk Space
- Check available disk space using `df -h`. If space is low, consider cleaning up unnecessary files or expanding your disk.

### 7. Firewall Blocking Connections
- Ensure that the firewall (UFW) is configured to allow traffic on the necessary ports (e.g., 80 for HTTP, 443 for HTTPS).

### 8. Missing Dependencies
- If the installation script fails due to missing packages, ensure your package list is updated with `apt update` and try running the installation again.

### 9. Application Not Responding
- Check the status of the application service with `systemctl status ubuntu-server-admin`.
- Review the application logs for any errors or issues.

## Additional Resources
- For more detailed information, refer to the official documentation or community forums related to the specific components (NGINX, PostgreSQL, Redis, etc.) you are using.