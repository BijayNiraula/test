const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3005 });

const clients = new Map();
const serviceProviders = new Map();
const serviceRequesters = new Map();
const cms = new Map();
const locations = new Map();

const broadcast = (message, sender, targetType) => {
  const targetMap =
    targetType === "provider"
      ? serviceProviders
      : targetType == "cms"
      ? cms
      : serviceRequesters;
  for (const [clientId, client] of targetMap.entries()) {
    if (client.ws !== sender && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
};
const updateOnlineProviders = () => {
  const onlineProviders = Array.from(serviceProviders.values())
    .filter((provider) => provider.ws.readyState === WebSocket.OPEN)
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      serviceType: provider.serviceType,
      location: provider.location,
    }));

  const message = {
    type: "onlineProviders",
    providers: onlineProviders,
  };

  broadcast(message, null, "requester");
};

const disconnectExistingClient = (userId, userType) => {
  const targetMap =
    userType === "provider" ? serviceProviders : serviceRequesters;
  const existingClient = Array.from(targetMap.entries()).find(
    ([clientId, client]) => client.id === userId
  );

  if (existingClient) {
    const [clientId, client] = existingClient;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
    targetMap.delete(clientId);
  }
};

const formatTimeDifference = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString();
};

wss.on("connection", (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);

  ws.on("message", (data) => {
    const message = JSON.parse(data);
    if (message.type === "init") {
      disconnectExistingClient(
        message.userType === "provider" ? message.userId : message.requesterId,
        message.userType
      );

      if (message.userType === "provider") {
        serviceProviders.set(clientId, {
          ws,
          id: message.userId,
          name: message.userName,
          serviceType: message.serviceType,
          location: message.location,
        });
        console.log(
          `Service provider ${message.userName} (${message.userId}) connected`
        );
      } else if (message.userType === "cms") {
        cms.set(clientId, {
          ws,
          id: message.id,
          name: message.name,
        });
        console.log("CMS admin connected");
      } else {
        console.log(message);
        serviceRequesters.set(clientId, {
          ws,
          id: message.requesterId,
          name: message.userName,
        });
        console.log(
          `Service requester ${message.userName} (${message.requesterId}) connected`
        );
      }
      updateOnlineProviders();
    } else if (message.type === "serviceRequest") {
      broadcast(
        {
          type: "serviceRequest",
          requesterId: message.requesterId,
          requesterName: message.requesterName,
          serviceDetails: message.serviceDetails,
          serviceTitle: message.serviceTitle,
          location: message.location,
          requestTime: new Date().toISOString(),
        },
        ws,
        "provider"
      );

      broadcast(
        {
          type: "serviceRequest",
          requesterId: message.requesterId,
          requesterName: message.requesterName,
          serviceDetails: message.serviceDetails,
          serviceTitle: message.serviceTitle,
          location: message.location,
          requestTime: new Date().toISOString(),
        },
        ws,
        "cms"
      );
    } else if (message.type === "serviceResponse") {
      const requester = Array.from(serviceRequesters.values()).find((r) => {
        return r.id === message.requesterId;
      });

      if (requester && requester.ws.readyState === WebSocket.OPEN) {
        console.log("Sending response to requester:", message.requesterId);
        requester.ws.send(
          JSON.stringify({
            type: "serviceResponse",
            requesterId: message.requesterId,
            providerId: message.providerId,
            providerName: message.providerName,
            serviceTitle: message.serviceTitle,
            accepted: message.accepted,
            providerLocation: message.providerLocation,
            responseTime: new Date().toISOString(),
          })
        );
      } else {
        console.log(
          "Requester not found or connection closed:",
          message.requesterId
        );
        console.log(
          "Available requesters:",
          Array.from(serviceRequesters.values()).map((r) => r.id)
        );
      }
      broadcast(
        {
          type: "serviceResponse",
          requesterId: message.requesterId,
          providerId: message.providerId,
          providerName: message.providerName,
          serviceTitle: message.serviceTitle,
          accepted: message.accepted,
          providerLocation: message.providerLocation,
          responseTime: new Date().toISOString(),
        },
        ws,
        "cms"
      );
      console.log(message.requesterId);
      console.log(message.accepted);
    } else if (message.type === "providerChosen") {
      const provider = Array.from(serviceProviders.values()).find(
        (p) => p.id === message.providerId
      );

      if (provider && provider.ws.readyState === WebSocket.OPEN) {
        console.log(message.providerId);
        provider.ws.send(
          JSON.stringify({
            type: "providerChosen",
            requesterId: message.requesterId,
            requesterName: message.requesterName,
            serviceDetails: message.serviceDetails,
            providerId: message.providerId,
            serviceTitle: message.serviceTitle,
            contactNumber: message.contactNumber,
            location: message.location,
            requestTime: message.requestTime,
            serviceHistoryId: message.serviceHistoryId,
            chosenTime: new Date().toISOString(),
            message: `${message.requesterName} has chosen you for their service!`,
          })
        );
      }

      broadcast(
        {
          type: "requestClosed",
          requesterId: message.requesterId,
        },
        ws,
        "provider"
      );
    } else if (message.type === "cancelRequest") {
      // Broadcast the cancellation to all providers
      broadcast(
        {
          type: "requestCancelled",
          requesterId: message.requesterId,
          requestTime: new Date().toISOString(),
        },
        ws,
        "provider"
      );
      broadcast(
        {
          type: "requestCancelled",
          requesterId: message.requesterId,
          requestTime: new Date().toISOString(),
        },
        ws,
        "cms"
      );
    } else if (message.type === "initLiveLocation") {
      const serviceId = message.serviceId;
      if (!locations.has(serviceId)) {
        locations.set(serviceId, {
          provider: null,
          user: null,
        });
      }

      const serviceLocations = locations.get(serviceId);
      if (message.userType === "provider") {
        serviceLocations.provider = { ws, online: true };
      } else {
        serviceLocations.user = { ws, online: true };
      }
    } else if (message.type === "locationUpdate") {
      console.log(`Location update received at: ${new Date().toISOString()}`);
      const serviceId = message.serviceId;
      const serviceLocations = locations.get(serviceId);

      if (!serviceLocations) return;

      if (message.userType === "provider") {
        console.log("reached here");
        console.log(message.location);

        if (serviceLocations.user?.ws.readyState === WebSocket.OPEN) {
          serviceLocations.user.ws.send(
            JSON.stringify({
              type: "providerLocation",
              location: message.location,
            })
          );
        }
      } else {
        if (serviceLocations.provider?.ws.readyState === WebSocket.OPEN) {
          serviceLocations.provider.ws.send(
            JSON.stringify({
              type: "userLocation",
              location: message.location,
            })
          );
        }
      }
    }
    // Add this case in your message handling logic in the WebSocket server
    else if (message.type === "disconnect") {
      const serviceId = message.serviceId;
      const serviceLocations = locations.get(serviceId);

      if (serviceLocations) {
        if (message.userType === "provider") {
          serviceLocations.provider = null;
          if (serviceLocations.user?.ws.readyState === WebSocket.OPEN) {
            serviceLocations.user.ws.send(
              JSON.stringify({
                type: "providerOffline",
              })
            );
          }
        } else {
          serviceLocations.user = null;
          if (serviceLocations.provider?.ws.readyState === WebSocket.OPEN) {
            serviceLocations.provider.ws.send(
              JSON.stringify({
                type: "userOffline",
              })
            );
          }
        }

        // Clean up the service location entry if both users are disconnected
        if (!serviceLocations.provider && !serviceLocations.user) {
          locations.delete(serviceId);
        }
      }
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
    serviceProviders.delete(clientId);
    serviceRequesters.delete(clientId);
    updateOnlineProviders();

    for (const [serviceId, serviceLocations] of locations.entries()) {
      if (serviceLocations.provider?.ws === ws) {
        if (serviceLocations.user?.ws.readyState === WebSocket.OPEN) {
          serviceLocations.user.ws.send(
            JSON.stringify({
              type: "providerOffline",
            })
          );
        }
        serviceLocations.provider = null;
      } else if (serviceLocations.user?.ws === ws) {
        if (serviceLocations.provider?.ws.readyState === WebSocket.OPEN) {
          serviceLocations.provider.ws.send(
            JSON.stringify({
              type: "userOffline",
            })
          );
        }
        serviceLocations.user = null;
      }

      if (!serviceLocations.provider && !serviceLocations.user) {
        locations.delete(serviceId);
      }
    }
  });
});

console.log("WebSocket server is running on ws://localhost:3005");
