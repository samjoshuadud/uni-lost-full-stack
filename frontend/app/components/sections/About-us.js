"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const tabVariants = {
  enter: {
    opacity: 0,
    y: 20,
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }
};

export default function AboutUs() {
  const [activeTab, setActiveTab] = useState("lost-found");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      {/* Tab Buttons */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#2E3F65] p-1.5 rounded-full inline-flex gap-2">
          <Button
            variant="ghost"
            className={`rounded-full px-6 py-2 transition-all duration-200 ${
              activeTab === "lost-found"
                ? "bg-yellow-400 text-[#003d99] font-semibold"
                : "text-white hover:text-yellow-400"
            }`}
            onClick={() => setActiveTab("lost-found")}
          >
            Lost & Found System
          </Button>
          <Button
            variant="ghost"
            className={`rounded-full px-6 py-2 transition-all duration-200 ${
              activeTab === "ohso"
                ? "bg-yellow-400 text-[#003d99] font-semibold"
                : "text-white hover:text-yellow-400"
            }`}
            onClick={() => setActiveTab("ohso")}
          >
            About OHSO
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "lost-found" ? (
          <motion.div
            key="lost-found"
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-8"
          >
            {/* Lost & Found Content */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-[#0052cc] mb-4">About UMak Lost & Found</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Your trusted platform for managing lost and found items at the University of Makati
              </p>
            </div>

            {/* How It Works Section */}
            <Card className="mt-12">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-[#0052cc] mb-6">How It Works</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-blue-600">1</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Report Items</h3>
                    <p className="text-gray-600">
                      Easily report lost items or register found items through our platform. 
                      Provide detailed descriptions and images to help with identification.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-blue-600">2</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Verification</h3>
                    <p className="text-gray-600">
                      Our OHSO staff carefully verifies all reported items and claims to ensure 
                      secure and accurate handling of lost and found property.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-blue-600">3</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Claim Items</h3>
                    <p className="text-gray-600">
                      Found items can be claimed at the OHSO office after successful verification. 
                      All items are handled with care and returned to their rightful owners.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="ohso"
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-8"
          >
            {/* OHSO Content */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-[#0052cc] mb-4">
                Occupational Health and Safety Office (OHSO)
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Ensuring health, safety, and security within the University of Makati
              </p>
            </div>

            {/* OHSO Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#0052cc] mb-4">Our Mission</h2>
                  <p className="text-gray-600">
                    Our mission is to tediously inspects, assesses, and promptly addresses all 
                    safety and wellness concerns through regular ocular inspections including safety
                    and health measure campaigns and implementations.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#0052cc] mb-4">Our Vision</h2>
                  <p className="text-gray-600">
                    Occupational Health and Safety Office envisions the university as an educational 
                    institution where perceived hazards are preempted and immediately addressed to 
                    ensure safety and wellness among its populace.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Core Values Section */}
            <Card className="mt-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-[#0052cc] mb-6">Core Values</h2>
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-800 mb-4">
                    Your Health and Safety is our priority.
                  </p>
                  <p className="text-gray-600">
                    We are committed to maintaining a safe and healthy environment for all members 
                    of the University of Makati community through proactive measures and immediate 
                    response to safety concerns.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Section - Shown for both tabs */}
      <Card className="mt-8">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold text-[#0052cc] mb-6">Contact Information</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Office Location</h3>
              <div className="space-y-2 text-gray-600">
                <p>OHSO (Occupational Health & Safety Office)</p>
                <p>Admin Building Basement</p>
                <p>University of Makati</p>
                <p>Office Hours: 8:00 AM - 5:00 PM (Monday - Friday)</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Our Commitment</h3>
              <div className="space-y-2 text-gray-600">
                <p>We are dedicated to maintaining a safe and organized environment for the UMak community.</p>
                <p>All concerns and items are handled with utmost care and professionalism.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
