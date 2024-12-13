"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, BookOpen, Users, Phone, ChevronLeft, ChevronRight } from "lucide-react";

const tabVariants = {
  enter: {
    opacity: 0,
    x: 100,
  },
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }
};

export default function AboutUs() {
  const [activeTab, setActiveTab] = useState("lost-found");
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    {
      id: "about",
      component: (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative px-8 py-16 text-center text-white">
              <h1 className="text-4xl font-bold mb-4">About OHSO</h1>
              <p className="text-xl max-w-3xl mx-auto">
                Office of Health Services and Organizations (OHSO) - Your trusted partner in maintaining health, safety, and security within the University of Makati community
              </p>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex flex-col items-center">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#0052cc] mb-4">Our Mission</h2>
                <p className="text-gray-700 text-center">
                Our mission is to tediously inspects, assesses, and promptly addresses all safety and wellness concerns through regular ocular inspections including safety and health measure campaigns and implementations.                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex flex-col items-center">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#0052cc] mb-4">Our Vision</h2>
                <p className="text-gray-700 text-center">
                Occupational Health and Safety Office envisions the university as an educational institution where perceived hazards are preempted and immediately addressed to ensure safety and wellness among its populace.                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "services",
      component: (
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#0052cc] mb-8 text-center">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-lg transform hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Shield className="w-12 h-12 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-[#0052cc]">Health Safety</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Maintain a Safe and Healthy Workplace
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Comprehensive Food Safety Monitoring (Canteen sanitation and cleanliness)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg transform hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Shield className="w-12 h-12 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-[#0052cc]">Emergency Preparedness and Disaster Management Program</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Emergency Drills (Earthquake, Fire and Bomb Threat)
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        DRRM Seminars
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Emergency Skills Training
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg transform hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Shield className="w-12 h-12 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-[#0052cc]">Facility Safety</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Comprehensive Facility Hazard Identification – Prevention of incident/accident related to facility
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Proper waste disposal
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg transform hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Shield className="w-12 h-12 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-[#0052cc]">Security</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        In-charge of the Private Security Contract in safeguarding the facilities, property and equipment
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: "team",
      component: (
        <div className="max-w-7xl mx-auto space-x-8 flex flex-row items-start">
          {/* Office Leadership */}
          <div className="bg-white rounded-3xl p-8 shadow-lg flex-1">
            <h2 className="text-3xl font-bold text-[#0052cc] mb-8 text-center">Office Leadership</h2>
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 rounded-full overflow-hidden mb-6">
                <Image
                  src="/images/benidicto.jpg"
                  alt="Mr. Orlando P. Benedicto"
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Mr. Orlando P. Benedicto</h3>
              <p className="text-gray-600 mb-4">Office Head, OHSO</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-[#0052cc] text-white hover:bg-[#003d99] transform hover:scale-105 transition-all duration-300 px-6 py-2 rounded-full"
                  >
                    View Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                  <DialogHeader className="flex-none">
                    <DialogTitle className="text-2xl font-bold text-[#0052cc] mb-4">About Mr. Orlando P. Benedicto</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-6 text-gray-700 pr-4">
                    <div className="flex items-center space-x-6 bg-blue-50 p-6 rounded-xl">
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-blue-100">
                          <Image
                            src="/images/benidicto.jpg"
                            alt="Mr. Orlando P. Benedicto"
                            width={128}
                            height={128}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#0052cc] mb-2">Mr. Orlando P. Benedicto</h3>
                        <p className="text-gray-600">Office Head, OHSO</p>
                        <p className="text-gray-600">University of Makati</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl">
                      <h4 className="text-lg font-semibold text-[#0052cc] mb-4">Professional Background</h4>
                      <p className="leading-relaxed">
                        Mr. Orlando P. Benedicto was with the University of Makati for the past 30 years, where he was the Procurement Section Head of the Supply and Property Management Office when designated as the head of the Occupational Health and Safety Office of the University in concurrent capacity in 2013. In April 2017 he assumed as full-time head of OHSO. In 2020 the outsourced Security personnel were put under his supervision and management.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl">
                      <h4 className="text-lg font-semibold text-[#0052cc] mb-4">Qualifications</h4>
                      <p className="leading-relaxed">
                        He has Construction Occupational Safety and Health (COSH) trainings and seminars from the City Disaster Risk Reduction Management Office (DRRMO) for various safety and emergency protocols and procedures.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl">
                      <h4 className="text-lg font-semibold text-[#0052cc] mb-4">Roles and Responsibilities as DRRMC Alternate Member</h4>
                      <ul className="list-disc pl-6 space-y-4">
                        <li className="leading-relaxed">Cover the function of the principal member across all Thematic Areas and all sectors in the absence of the principal member.</li>
                        <li className="leading-relaxed">Participate in the various meetings, workshops, trainings, seminars, and planning sessions of the Makati DRRM Council and provide valuable inputs, as necessary.</li>
                        <li className="leading-relaxed">Decide, as authorized, in behalf of the Member or Department/Office Head on matters needing immediate response.</li>
                        <li className="leading-relaxed">Communicate all discussions and agreements made during the DRRMC meeting and activities to the Member and other Alternate Member, as applicable, and other personnel in his/her department, as necessary.</li>
                        <li className="leading-relaxed">Exert all effort to build his/her capacity in disaster risk reduction and management.</li>
                        <li className="leading-relaxed">Serve as the focal person for the development, implementation, and monitoring of DRRM programs, projects, and activities.</li>
                        <li className="leading-relaxed">Serve as focal person during re-echoing and brown-bag sessions, as necessary.</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Team Table */}
          <div className="bg-white rounded-3xl p-8 shadow-lg flex-[1.5]">
            <h2 className="text-3xl font-bold text-[#0052cc] mb-8 text-center">Our Team</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Staff</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { name: "Orlando P. Benedicto", role: "Head, OHSO" },
                    { name: "Adrian M. Yumping", role: "In Charge Facility Safety and CCTV Support Staff" },
                    { name: "Arch. Elmer M. Cabrera", role: "Staff (TDY)" },
                    { name: "Rolando G. Marquez", role: "Staff (TDY)" },
                    { name: "Bianca Alexis C. Calleja", role: "Administrative Staff" }
                  ].map((staff, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{staff.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "contact",
      component: (
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-[#0052cc] mb-8 text-center">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Office Head</h3>
                  <div className="space-y-3 text-gray-600">
                    <p className="font-semibold">MR. ORLANDO P. BENEDICTO</p>
                    <p>Head, OHSO</p>
                    <p>Direct Line: (02) 8882-0535</p>
                    <p>Email: ohso@umak.edu.ph</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Office Location</h3>
                  <div className="space-y-3 text-gray-600">
                    <p>Basement Level, Administration Building</p>
                    <p>UMak Campus, J. P. Rizal Extension</p>
                    <p>West Rembo, City of Taguig 1644</p>
                    <p>Office Hours: 8:00 AM - 5:00 PM (Monday - Friday)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  const nextSection = () => {
    setCurrentSection((prev) => (prev < sections.length - 1 ? prev + 1 : prev));
  };

  const prevSection = () => {
    setCurrentSection((prev) => (prev > 0 ? prev - 1 : prev));
  };

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
            className="relative min-h-screen"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSection}
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="py-8 px-4"
              >
                {sections[currentSection].component}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center gap-4">
              <Button
                onClick={prevSection}
                disabled={currentSection === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2"
                variant="ghost"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex gap-2">
                {sections.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSection(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      currentSection === index 
                        ? "bg-blue-600 w-6" 
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={nextSection}
                disabled={currentSection === sections.length - 1}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2"
                variant="ghost"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
