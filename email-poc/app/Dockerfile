# Use the pre-built multi-arch NiceGUI image
FROM zauberzeug/nicegui:latest

# Set working directory to /app
WORKDIR /app

# Copy only main.py, babst_es.py, and requirements.txt to /app in the container
# COPY frontend.py search_api.py signed_url.py app.yaml requirements.txt sa.json /app/
COPY frontend.py backend.py signed_url.py requirements.txt /app/

# Install any necessary Python packages
RUN pip install -r requirements.txt

# Expose port 8080 on the container
EXPOSE 8080

# Command to run the application
# Assumes that your main.py uses port 8080 for ui.run (default)
CMD ["python", "frontend.py"]